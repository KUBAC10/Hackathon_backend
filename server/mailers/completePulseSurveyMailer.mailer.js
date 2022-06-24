import { promises as fs } from 'fs';

// models
import {
  PulseSurveyRecipient,
  Mailer
} from '../models';

// helpers
import parseTpl from '../helpers/parse-es6-template';
import mailBuilder from '../helpers/mailBuilder';
import { getPassTime } from './pulseRoundMailer';

// config
import config from '../../config/env';

export default async function completePulseSurveyMailerMailer({ surveyResult }) {
  try {
    if (!surveyResult.recipient) return;

    const recipient = await PulseSurveyRecipient.model
      .findOne({ _id: surveyResult.recipient })
      .populate({
        path: 'surveyCampaign',
        populate: 'company'
      })
      .lean();

    if (!recipient || !recipient.surveyCampaign || recipient.unsubscribe) return;

    const { surveyCampaign, email } = recipient;

    if (!surveyCampaign.sendCompletionMailer || !email) return;

    const mailer = await Mailer.model
      .findOne({
        company: surveyResult.company,
        type: 'pulseCompleted'
      })
      .lean();

    if (!mailer || !mailer.template) return;

    const data = {
      hostname: config.hostname,
      unsubscribe: `${config.hostname}/unsubscribe?token=${surveyResult.token}`,
      facebook: 'https://www.facebook.com/screverr',
      linkedin: 'https://www.linkedin.com/company/screver/',
      instagram: 'https://www.instagram.com/screverr/',
      home: config.hostname,
      terms: 'https://screver.com/terms-conditions/',
      privacy: 'https://screver.com/privacy-policy/',
      passTime: getPassTime(surveyCampaign.questionPerSurvey),
      signIn: 'https://app.screver.com/',
    };

    if (surveyCampaign.completionMailerCustomText) {
      const buffer = await fs.readFile('server/mailers/pulseMailers/customerTextBlock.html');

      data.customerTextBlock = parseTpl(buffer.toString(), {
        customerText: surveyCampaign.completionMailerCustomText
      }, '');
    }

    mailer.template = parseTpl(mailer.template, data, '');

    await mailBuilder({
      data,
      mailer,
      to: recipient.email,
      type: 'email',
      save: true,
      company: surveyCampaign.company
    });
  } catch (e) {
    return console.error(e);
  }
}
