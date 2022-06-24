import twilioClient from '../services/Twilio';
import config from '../../config/env';
import parseTpl from './parse-es6-template';

// models
import Email from '../models/Email';

export default async function smsBuilder(options) {
  try {
    const { data, mailer, to, user, type, save } = options;

    const parsedTemplate = parseTpl(mailer.smsTemplate, data, '');

    await twilioClient.messages.create({
      messagingServiceSid: config.messagingServiceSid,
      body: parsedTemplate,
      from: 'Screver',
      to: `+${to}`
    });

    if (save) {
      await Email.model.create({
        to,
        user,
        type,
        mailer,
        data: JSON.stringify(data, null, 4),
      });
    }
  } catch (e) {
    return console.error(e);
  }
}
