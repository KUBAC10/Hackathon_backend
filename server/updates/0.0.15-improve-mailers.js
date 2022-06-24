import { Mailer } from '../models';

import emailTemplateBuilder from '../helpers/emailTemplateBuilder';
import {
  abortTransaction,
  commitTransaction,
  initSessionWithTransaction
} from '../helpers/transactions';

export default async function mailers(done) {
  const session = await initSessionWithTransaction();
  try {
    const [
      upConfirmCompany,
      upContactUs,
      upResetPassword,
      upUserRegistration
    ] = await Promise.all([
      Mailer.model.findOne({ name: 'Confirm Company' }),
      Mailer.model.findOne({ name: 'Contact Us' }),
      Mailer.model.findOne({ name: 'Reset Password' }),
      Mailer.model.findOne({ name: 'User Registration' })
    ]);

    upConfirmCompany.template = emailTemplateBuilder(
      [
        'Hi!',
        'To confirm your company ${companyName} email please redirect to the following link - https://${hostname}/company-confirm/${token}'
      ],
      [
        'Screver',
        '2019'
      ]);

    upContactUs.template = emailTemplateBuilder(
      [
        '${date}',
        'Person: ${name}, email: ${email}, lang: ${lang}  left comment:',
        '${comment}'
      ],
      [
        'Screver',
        '2019'
      ]);

    upResetPassword.template = emailTemplateBuilder(
      [
        'We got a request to reset your password.',
        'For reset your password please redirect to the following link - https://${hostname}/reset-password/${resetToken}',
        'If you ignore this message, your password will not be changed.'
      ],
      [
        'Screver',
        '2019'
      ]);

    upUserRegistration.template = emailTemplateBuilder(
      [
        'Hi: ${firstName} ${lastName}!',
        'You was successfully registered in Screver! To confirm your email please redirect to the following link - https://${hostname}/user-confirm/${token}'
      ],
      [
        'Screver',
        '2019'
      ]);

    await Promise.all([
      upConfirmCompany.save({ session }),
      upContactUs.save({ session }),
      upResetPassword.save({ session }),
      upUserRegistration.save({ session })
    ]);

    // commit transaction
    commitTransaction(session)
      .then(() => done())
      .catch((e) => {
        console.error('Updates error: improve mailers seed', e);
        done(e);
      });
  } catch (e) {
    abortTransaction(session).then(() => {
      console.error('Updates error: improve mailers seed', e);
      done(e);
    });
  }
}
