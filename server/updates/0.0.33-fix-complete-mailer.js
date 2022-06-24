import { GlobalMailer } from '../models';

export default async function fixCompleteMailer(done) {
  try {
    await GlobalMailer.model.updateOne({ name: 'Base Complete' }, {
      $set: {
        templateVariables: JSON.stringify({
          companyName: 'companyName',
          surveyName: 'surveyName',
          firstName: 'firstName',
          lastName: 'lastName',
          email: 'email'
        }, null, 4),
      }
    });

    done();
  } catch (e) {
    console.error('Updates error: 0.0.33 fix survey complete mailer', e);
    done(e);
  }
}
