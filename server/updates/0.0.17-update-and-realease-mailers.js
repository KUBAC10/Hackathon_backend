import { GlobalMailer, Mailer } from '../models';
import {
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
} from '../helpers/transactions';
import emailTemplateBuilder from '../helpers/emailTemplateBuilder';

export default async function updateAndReleaseMailers(done) {
  const session = await initSessionWithTransaction();
  try {
    // remove old invitation mailer
    const oldInvitation = await Mailer.model.findOne({ name: 'Survey Invitation' });
    if (oldInvitation) await oldInvitation.remove();

    // create global mailers and set as release
    await GlobalMailer.model.create({
      name: 'Base Invitation',
      subject: 'Survey Invitation',
      type: 'surveyInvitation',
      templateVariables: JSON.stringify({
        companyName: 'companyName',
        surveyName: 'surveyName',
        link: 'link',
        firstName: 'firstName',
        lastName: 'lastName',
        email: 'email'
      }, null, 4),
      description: 'Email that is send to user as survey invitation',
      release: true,
      template: emailTemplateBuilder(
        [
          'You was invited to survey - ${surveyName}',
          'To pass survey please redirect to the following link - ${link}'
        ],
        [
          '${companyName}',
          '2019'
        ]
      )
    });

    await GlobalMailer.model.create({
      name: 'Base Complete',
      subject: 'Survey Complete',
      type: 'surveyComplete',
      templateVariables: JSON.stringify({
        companyName: 'companyName',
        surveyName: 'companyName',
        firstName: 'firstName',
        lastName: 'lastName',
        email: 'email'
      }, null, 4),
      description: 'Email that is send to user after complete survey',
      release: true,
      template: emailTemplateBuilder(
        [
          'You had successfully completed survey - ${surveyName}!',
          'We thank you for your time spent taking this survey.'
        ],
        [
          '${companyName}',
          '2019'
        ]
      )
    });

    // commit transaction
    commitTransaction(session)
      .then(() => done())
      .catch((e) => {
        console.error('Updates error: 0.0.17 update mailers', e);
        done(e);
      });
  } catch (e) {
    abortTransaction(session).then(() => {
      console.error('Updates error: 0.0.17 update mailers', e);
      done(e);
    });
  }
}
