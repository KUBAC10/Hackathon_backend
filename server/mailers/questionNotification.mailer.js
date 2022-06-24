import fs from 'fs';
import eachLimit from 'async/eachLimit';
import get from 'lodash/get';

// models
import { Mailer } from '../models';

// configurations
import config from '../../config/env';

// helpers
import mailBuilder from '../helpers/mailBuilder';
import getCompanyName from '../helpers/getCompanyName';

const root = config.root;
const baseTemplate = fs.readFileSync(`${root}/mailers/templates/base.template.html`, 'utf8');

// send mails when appropriate question was answered
export default async function questionNotification({ notifications, lang }) {
  try {
    if (config.env !== 'production' && !notifications.length) return;

    // find mailers
    const mailers = await Mailer.model
      .find({ _id: { $in: notifications.map(n => n.mailer) } })
      .populate('company')
      .lean();

    const global = await Mailer.model.findOne({ type: 'questionNotification', fromGlobal: true });

    const data = notifications.map((n) => {
      n.mailer = mailers.find(m => m._id.toString() === n.mailer.toString()) || global;
      return n;
    });

    // send mails
    await eachLimit(data, 5, (d, callback) => {
      const data = {
        questionName: get(d, `questionName.${lang}`, ''),
        surveyName: get(d, `surveyName.${lang}`, ''),
        companyName: getCompanyName(get(d, 'company')),
        answer: get(d, 'answer', ''),
        customAnswer: get(d, 'customAnswer', ''),
        hostname: config.hostname,
        year: new Date().getFullYear()
      };

      // build template
      // interpolate template with mailer template
      // reassing parsed template to mailer
      d.mailer.template = baseTemplate.replace('${content}', d.mailer.template);

      // send mail to each contact
      eachLimit(d.emails, 5, (to, cb) => {
        mailBuilder({
          data,
          mailer: d.mailer,
          lang,
          company: get(d, 'mailer.company', 'Screver'),
          to,
          type: 'email',
          save: true
        })
          .then(() => cb())
          .catch(cb);
      })
        .then(() => callback())
        .catch(callback);
    });
  } catch (e) {
    return console.error(e);
  }
}
