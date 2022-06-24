import { promises as fs } from 'fs';

// models
import { GlobalMailer } from '../models';

export default async function addAutoReportMailer(done) {
  try {
    const template = await fs.readFile('server/mailers/autoReportsMailer/index.html');

    const globalMailer = new GlobalMailer.model({
      name: 'Auto Report',
      description: 'Mailer for auto reports',
      type: 'autoReport',
      templateVariables: JSON.stringify({
        reportName: 'reportName',
        reportDate: 'reportDate',
        filters: 'filters'
      }, null, 4),
      subject: 'Auto Report',
      template,
    });

    await globalMailer.save();

    done();
  } catch (e) {
    return done(e);
  }
}
