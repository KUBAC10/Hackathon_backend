import _ from 'lodash';

//  helpers
import { initSession } from '../helpers/transactions';

//  models
import {
  Mailer,
  GlobalMailer
} from '../models';

export default async function removeMailerLocalization(done) {
  const session = await initSession();

  try {
    // load mailers
    const mailers = await Mailer.model.find({ type: { $exists: true } }).lean();

    // handle mailers
    mailers.forEach((mailer) => {
      const { subject = {}, template = {}, smsTemplate = {} } = mailer;

      // get eng or another existing lang string from localization
      mailer.subject = _getStringFromLocalization(subject);
      mailer.template = _getStringFromLocalization(template);
      mailer.smsTemplate = _getStringFromLocalization(smsTemplate);
    });

    // update mailers
    await session.withTransaction(async () => {
      for (const mailer of mailers) {
        const { _id, subject, template, smsTemplate } = mailer;

        await Mailer.model.updateOne({ _id }, { subject, template, smsTemplate }, { session });
      }
    });

    // load global mailers
    const globalMailers = await GlobalMailer.model.find({ type: { $exists: true } }).lean();

    // handle global mailers
    globalMailers.forEach((mailer) => {
      const { subject = {}, template = {}, smsTemplate = {}, description = {} } = mailer;

      // get eng or another existing lang string from localization
      mailer.subject = _getStringFromLocalization(subject);
      mailer.template = _getStringFromLocalization(template);
      mailer.smsTemplate = _getStringFromLocalization(smsTemplate);
      mailer.description = _getStringFromLocalization(description);
    });

    await session.withTransaction(async () => {
      for (const mailer of globalMailers) {
        const { _id, subject, template, smsTemplate, description } = mailer;

        await GlobalMailer.model
          .updateOne({ _id }, { subject, template, smsTemplate, description }, { session });
      }
    });

    done();
  } catch (e) {
    console.log('Update error: remove mailer localization');
    return done(e);
  }
}

function _getStringFromLocalization(obj) {
  if (typeof obj === 'string') return obj;

  return _.get(obj, 'en', _.get(obj, Object.keys(obj).find(lang => obj[lang] && obj[lang].length)));
}
