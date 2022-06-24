// models
import { GlobalMailer } from '../models';

// helpers
import parseTpl from '../helpers/parse-es6-template';
import mailBuilder from '../helpers/mailBuilder';

export default async function autoReportsMailer(options = {}) {
  try {
    const { filters, attachments, reportName, reportDate, invitesData = [] } = options;

    // load mailer
    const mailer = await GlobalMailer.model
      .findOne({ type: 'autoReport' })
      .lean();

    if (!mailer) return console.error('autoReportsMailer mailer not found');

    const data = {
      filters,
      reportName,
      reportDate
    };

    for (const recipient of invitesData) {
      const { email } = recipient;

      mailer.template = parseTpl(mailer.template, data, '');

      await mailBuilder({
        data,
        mailer,
        to: email,
        type: 'email',
        attachments,
        save: true
      });
    }
  } catch (e) {
    return console.error(e);
  }
}
