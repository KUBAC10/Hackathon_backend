import { Mailer } from '../models';
import {
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
} from '../helpers/transactions';
import emailTemplateBuilder from '../helpers/emailTemplateBuilder';

export default async function updateBaseMailers(done) {
  const session = await initSessionWithTransaction();
  try {
    // remove old reset password mailer
    await Mailer.model.find({ name: 'Reset Password' }).remove();

    // create new reset password mailer
    await Mailer.model.create({
      type: 'base',
      name: 'Reset Password',
      subject: 'Screver - Reset Password',
      template: emailTemplateBuilder(
        [
          'We got a request to reset your password.',
          'For reset your password please redirect to the following link - ${link}',
          'If you ignore this message, your password will not be changed.'
        ],
        [
          'Screver',
          '2019'
        ])
    });

    // commit transaction
    commitTransaction(session)
      .then(() => done())
      .catch((e) => {
        console.error('Updates error: 0.0.18 update mailers', e);
        done(e);
      });
  } catch (e) {
    abortTransaction(session).then(() => {
      console.error('Updates error: 0.0.18 update mailers', e);
      done(e);
    });
  }
}
