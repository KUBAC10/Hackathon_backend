import { promises as fs } from 'fs';

//  helpers
import { initSession } from '../helpers/transactions';
import parseTpl from '../helpers/parse-es6-template';

// models
import { GlobalMailer } from '../models';

export default async function createPulseMailers(done) {
  try {
    const session = await initSession();

    const [
      completed,
      firstInvitation,
      secondInvitation,
      reminder,
      reminderAfterFirstInvitation,
      reminderAfterSecondInvitation,
      reminderWithQuestion,
      basePulseTemplateBuffer
    ] = await Promise.all([
      fs.readFile('server/mailers/pulseMailers/completed.html'),
      fs.readFile('server/mailers/pulseMailers/firstInvitation.html'),
      fs.readFile('server/mailers/pulseMailers/secondInvitation.html'),
      fs.readFile('server/mailers/pulseMailers/reminder.html'),
      fs.readFile('server/mailers/pulseMailers/reminderAfterFirstInvitation.html'),
      fs.readFile('server/mailers/pulseMailers/reminderAfterSecondInvitation.html'),
      fs.readFile('server/mailers/pulseMailers/reminderWithQuestion.html'),
      fs.readFile('server/mailers/templates/pulse.template.html')
    ]);

    const basePulseTemplate = basePulseTemplateBuffer.toString();

    const pulseCompletedMailer = new GlobalMailer.model({
      name: 'Base Pulse Completed Mailer',
      subject: 'Thanks for your voice. It’s important & valuable 💛',
      type: 'pulseCompleted',
      templateVariables: JSON.stringify({
        hostName: 'hostName'
      }, null, 4),
      description: 'Email that is send to user as pulse survey was completed',
      release: true,
      template: parseTpl(basePulseTemplate, { content: completed.toString() })
    });

    const firstInvitationMailer = new GlobalMailer.model({
      name: 'Base Pulse First Invitation Mailer',
      subject: 'Let’s make ${companyName} a better place to work with your feedback 👏',
      type: 'pulseFirstInvitation',
      templateVariables: JSON.stringify({
        username: 'username',
        hostName: 'hostName',
        companyName: 'companyName',
        customerText: 'customerText',
        surveyLink: 'surveyLink'
      }, null, 4),
      release: true,
      template: parseTpl(basePulseTemplate, { content: firstInvitation.toString() })
    });

    const secondInvitationMailer = new GlobalMailer.model({
      name: 'Base Pulse Second Invitation Mailer',
      subject: 'Let’s make ${companyName} a better place to work with your opinion 👏',
      type: 'pulseSecondInvitation',
      templateVariables: JSON.stringify({
        username: 'username',
        hostName: 'hostName',
        questionContent: 'questionContent',
        customerText: 'customerText',
        surveyLink: 'surveyLink',
      }, null, 4),
      release: true,
      pulse: true,
      template: parseTpl(basePulseTemplate, { content: secondInvitation.toString() })
    });

    const reminderMailer = new GlobalMailer.model({
      name: 'Base Pulse Reminder Mailer',
      subject: 'Your opinion matters ✨',
      type: 'pulseReminder',
      templateVariables: JSON.stringify({
        hostname: 'hostname',
        username: 'username',
        surveyLink: 'surveyLink',
        numberOfQuestions: 'numberOfQuestions'
      }, null, 4),
      release: true,
      pulse: true,
      template: parseTpl(basePulseTemplate, { content: reminder.toString() })
    });

    const reminderAfterFirstInvitationMailer = new GlobalMailer.model({
      name: 'Base Pulse Reminder After First Invitation Mailer',
      subject: 'Your voice matters ✨',
      type: 'reminderAfterFirstInvitation',
      templateVariables: JSON.stringify({
        hostname: 'hostname',
        username: 'username',
        companyName: 'companyName',
        questionContent: 'questionContent',
        customerText: 'customerText',
        surveyLink: 'surveyLink'
      }, null, 4),
      release: true,
      pulse: true,
      template: parseTpl(basePulseTemplate, { content: reminderAfterFirstInvitation.toString() })
    });

    const reminderAfterSecondInvitationMailer = new GlobalMailer.model({
      name: 'Base Pulse Reminder After Second Invitation Mailer',
      subject: 'Your feedback matters ✨',
      type: 'reminderAfterSecondInvitation',
      templateVariables: JSON.stringify({
        hostname: 'hostname',
        username: 'username',
        companyName: 'companyName',
        questionContent: 'questionContent',
        surveyLink: 'surveyLink',
        numberOfQuestions: 'numberOfQuestions'
      }, null, 4),
      release: true,
      pulse: true,
      template: parseTpl(basePulseTemplate, { content: reminderAfterSecondInvitation.toString() })
    });

    const reminderWithQuestionMailer = new GlobalMailer.model({
      name: 'Base Pulse Reminder With Question Mailer',
      subject: 'Your feedback matters ✨',
      type: 'pulseReminderWithQuestion',
      templateVariables: JSON.stringify({
        hostname: 'hostname',
        username: 'username',
        companyName: 'companyName',
        questionContent: 'questionContent',
        surveyLink: 'surveyLink',
        numberOfQuestions: 'numberOfQuestions'
      }, null, 4),
      release: true,
      pulse: true,
      template: parseTpl(basePulseTemplate, { content: reminderWithQuestion.toString() })
    });

    await session.withTransaction(async () => {
      await Promise.all([
        pulseCompletedMailer.save({ session }),
        firstInvitationMailer.save({ session }),
        secondInvitationMailer.save({ session }),
        reminderMailer.save({ session }),
        reminderAfterFirstInvitationMailer.save({ session }),
        reminderAfterSecondInvitationMailer.save({ session }),
        reminderWithQuestionMailer.save({ session })
      ]);
    });

    done();
  } catch (e) {
    console.log('Update error: createPulseMailers');
    return done(e);
  }
}

