import { GlobalMailer } from '../models';
import {
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
} from '../helpers/transactions';
import emailTemplateBuilder from '../helpers/emailTemplateBuilder';

export default async function createQuestionNotificationMailer(done) {
  const session = await initSessionWithTransaction();
  try {
    // create global mailer
    await GlobalMailer.model.create({
      type: 'questionNotification',
      name: 'Question notification',
      subject: 'Question notification',
      templateVariables: JSON.stringify({
        companyName: 'companyName',
        questionName: 'questionName',
        surveyName: 'surveyName',
        answer: 'answer',
        customAnswer: 'customAnswer'
      }, null, 4),
      description: 'Email that is send when question was answered',
      release: true,
      template: emailTemplateBuilder(
        [
          'Survey: ${surveyName}',
          'We just received the following answer regarding your question: ${questionName}',
          'Answer: ${answer}',
          '${customAnswer}'
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
        console.error('Updates error: 0.0.31 create question notification mailer', e);
        done(e);
      });
  } catch (e) {
    abortTransaction(session).then(() => {
      console.error('Updates error: 0.0.31 create question notification mailer', e);
      done(e);
    });
  }
}
