/* eslint-disable */

//  helpers
import { initSession } from '../helpers/transactions';

//  models
import {
  Mailer,
  GlobalMailer
} from '../models';

const invitationContent =
  '<div style="text-align: center">' +
  '<p>Hello, ${firstName}</p>' +
  '<p>Please find some minutes and complete our ${surveyName}!</p>' +
  '<p>To pass survey please redirect to the following link</p>' +
  '</div>';

const completeContent =
  '<div style="text-align: center">' +
  '<p>Thank you, ${firstName}</p>' +
  '<p>You successfully completed our ${surveyName}!</p>' +
  '</div>';

const notificationContent =
  '<div style="text-align: center">' +
  '<p>Survey: ${surveyName}</p>' +
  '<p>We just received the following answer regarding your question: ${questionName}</p>' +
  '<p>Answer: ${answer}</p>' +
  '<p>${customAnswer}</p>' +
  '</div>';

export default async function updateGlobalMailers(done) {
  try {
    const session = await initSession();

    await session.withTransaction(async () => {
      // update global mailers
      const globalMailers = await GlobalMailer.model.find();

      const surveyInvitation = globalMailers.find(i => i.type === 'surveyInvitation');
      surveyInvitation.template = invitationContent;
      await surveyInvitation.save({ session });

      const surveyComplete = globalMailers.find(i => i.type === 'surveyComplete');
      surveyComplete.template = completeContent;
      await surveyComplete.save({ session });

      const questionNotification = globalMailers.find(i => i.type === 'questionNotification');
      questionNotification.template = notificationContent;
      await questionNotification.save({ session });

      // update exist mailers
      const mailers = await Mailer.model.find();
      for (const mailer of mailers) {
        if (mailer.type === 'surveyInvitation') {
          mailer.template = invitationContent;
          await mailer.save({ session });
        }

        if (mailer.type === 'surveyComplete') {
          mailer.template = completeContent;
          await mailer.save({ session });
        }

        if (mailer.type === 'questionNotification') {
          mailer.template = notificationContent;
          await mailer.save({ session });
        }

        if (mailer.type === 'base' && mailer.name === 'Reset Password') {
          mailer.template =
            '<div style="text-align: center">' +
            '<p>Here is your reset password link</p>' +
            '<p>If you did not submit a request, please ignore this message.</p>' +
            '<p>For reset, please use following link</p>' +
            '</div>'

          await mailer.save({ session });
        }

        if (mailer.type === 'base' && mailer.name === 'Confirm Email') {
          mailer.template =
            '<div style="text-align: center">' +
            '<p>Confirm your email address</p>' +
            '<p>Let\'s finish creating your account. To complete your sign up, we just need to verify your email address</p>' +
            '<p>Once verified, you can start using all of Screver features to build perfect forms</p>' +
            '<p>For confirmation, please use following link</p>' +
            '</div>'

          await mailer.save({ session });
        }

        if (mailer.type === 'base' && mailer.name === 'Invites Limitation') {
          mailer.template =
            '<div style="text-align: center">' +
            '<p>Hello, ${firstName}</p>' +
            '<p>You had exceed monthly limit of invitations on "Screver Lite" plan</p>' +
            '<p>To upgrade to full version, or any other questions, please contact support:</p>' +
            '<p>screver@screver.com</p>' +
            '</div>'

          await mailer.save({ session });
        }
      }
    });

    done();
  } catch (e) {
    console.log('Update error: updateGlobalMailers');
    return done(e);
  }
}
