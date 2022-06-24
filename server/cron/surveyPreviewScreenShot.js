import puppeteer from 'puppeteer';
import chalk from 'chalk';
import uuid from 'uuid';

// config
import config from '../../config/env';

// models
import {
  Survey,
  SurveyResult,
  Invite
} from '../models';

// services
import CloudinaryUploader from '../services/CloudinaryUploader';

// simulate preview page and make a screen shot of survey
export default async function surveyPreviewScreenShot() {
  let browser;

  try {
    // TODO create correct url for test/dev/prod
    const host = config.env === 'production' ? config.hostname : 'http://localhost:3000';

    // make a cursor for surveys
    const cursor = Survey.model
      .find({ updatePreviewScreenShot: true })
      .select('_id company previewScreenShot updatePreviewScreenShot')
      .cursor();

    // iterate cursor
    for (let survey = await cursor.next(); survey != null; survey = await cursor.next()) {
      const token = uuid();
      const previewUrl = `${host}/survey?token=${token}`;

      // init virtual browser if not exists
      if (!browser) {
        browser = await puppeteer.launch({
          defaultViewport: {
            height: 1170,
            width: 1500
          }
        });
      }

      // TODO create special routes/invites for optimizing
      const [
        page,
        invite,
      ] = await Promise.all([
        // open new page
        browser.newPage(),
        // create temporary invite
        Invite.model.create({
          token,
          survey: survey._id,
          type: 'global',
          preview: true
        })
      ]);

      // Allow JS.
      await page.setJavaScriptEnabled(true);

      // check and apply auth
      const { authBasicUsername, authBasicPassword } = config;
      if (authBasicUsername && authBasicPassword) {
        // set the HTTP Basic Authentication credential
        await page.authenticate({
          username: authBasicUsername,
          password: authBasicPassword
        });
      }

      // open preview link
      await page.goto(previewUrl, { waitUntil: 'networkidle2' });

      // wait till all base animations completed
      await page.waitForTimeout(5000);

      // make a screen shot
      const base64 = await page.screenshot({
        encoding: 'base64',
        type: 'jpeg',
        quality: 70,
        clip: {
          y: 60,
          x: 0,
          height: 1050,
          width: 1500
        }
      });

      // clear old screen shot if exists
      if (survey.previewScreenShot && survey.previewScreenShot.public_id) {
        await CloudinaryUploader.cleanUp({ public_id: survey.previewScreenShot.public_id });
      }

      // load new screen shot to cloudinary
      survey.previewScreenShot = await CloudinaryUploader.uploadImage({
        entity: survey,
        company: survey.company,
        actionName: 'surveyPreview',
        encodedFile: `data:image/jpeg;base64,${base64}`
      });

      // unset survey screen shot update flag
      survey.updatePreviewScreenShot = undefined;

      // remove temporary invite and surveyResult, save survey, close page
      await Promise.all([
        SurveyResult.model.remove({ survey: survey._id, token }),
        invite.remove(),
        survey.save(),
        page.close()
      ]);
    }

    // close browser
    if (browser) await browser.close();

    console.log(chalk.green('Updated survey screen shots'));
  } catch (e) {
    console.log(chalk.red(`Survey preview screen shot error: ${e}`));

    // close browser
    if (browser) await browser.close();
  }
}
