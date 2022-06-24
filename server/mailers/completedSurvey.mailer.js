import _ from 'lodash';
import fs from 'fs';

// helpers
import mailBuilder from '../helpers/mailBuilder';
import getCompanyName from '../helpers/getCompanyName';

// models
import {
  Mailer,
  Invite,
  GlobalMailer
} from '../models';

import config from '../../config/env';

const root = config.root;
const baseTemplate = fs.readFileSync(`${root}/mailers/templates/base.template.html`, 'utf8');

export default async function completedSurveyMailer(options) {
  try {
    const {
      survey,
      lang,
      surveyResult: { token, email }
    } = options;

    let mailer;

    const invite = await Invite.model
      .findOne({ token })
      .populate([
        {
          path: 'contact',
        },
        {
          path: 'company'
        },
        {
          path: 'surveyCampaign',
          select: 'completionMailer sendCompletionMailer'
        }
      ])
      .lean();

    if (!invite) return console.error('Invalid result');

    if (!invite.surveyCampaign || !invite.surveyCampaign.sendCompletionMailer) return;

    mailer = await Mailer.model
      .findById(invite.surveyCampaign.completionMailer)
      .lean();

    if (!mailer) {
      const globalMailer = await GlobalMailer.model
        .findOne({ type: 'surveyComplete' })
        .lean();

      if (!globalMailer) return console.error('Completed survey global mailer error', 'survey', survey._id);

      mailer = await Mailer.model
        .findOne({
          fromGlobal: true,
          globalMailer: globalMailer._id,
          company: survey.company
        })
        .lean();
    }

    if (!mailer) return console.error('Completed Survey Error');

    const data = {
      surveyName: survey.name[survey.defaultLanguage],
      email: _.get(invite, 'contact.email', email),
      firstName: _.get(invite, 'contact.name.first', ''),
      lastName: _.get(invite, 'contact.name.last', ''),
      hostname: config.hostname,
      companyName: getCompanyName(_.get(invite, 'company')),
      year: new Date().getFullYear()
    };

    // build template
    // interpolate template with mailer template
    // reassing parsed template to mailer
    mailer.template = baseTemplate.replace('${content}', mailer.template);

    if ((invite.contact && invite.contact.email) || email) {
      await mailBuilder({
        data,
        mailer,
        lang,
        company: survey.company,
        to: _.get(invite, 'contact.email', email),
        type: 'email',
        save: true
      });
    }
  } catch (e) {
    return console.error(e);
  }
}
