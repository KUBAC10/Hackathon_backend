import { promises as fs } from 'fs';
import _ from 'lodash';

// models
import {
  PulseSurveyRecipient,
  SurveySection,
  Company
} from '../models';

// config
import config from '../../config/env';

// helpers
import parseTpl from '../helpers/parse-es6-template';
import mailBuilder from '../helpers/mailBuilder';
import pulseMailerQuestionTemplateBuilder from '../helpers/pulseMailerQuestionTemplateBuilder';

// TODO test
export default async function pulseRoundMailer({ survey, mailer, roundResult, campaign }) {
  try {
    if (config.env !== 'production') return false;

    if (!mailer || !mailer.template) {
      return console.error('pulseRoundMailer mailer error', mailer._id);
    }

    const [
      recipient,
      surveySections,
      company
    ] = await Promise.all([
      PulseSurveyRecipient.model
        .findById(roundResult.recipient)
        .populate('contact')
        .lean(),
      SurveySection.model
        .find({
          survey: survey._id,
          hide: { $ne: true },
          inDraft: { $ne: true }
        })
        .sort('sortableId')
        .populate({
          path: 'surveyItems',
          match: {
            _id: { $in: Object.keys(roundResult.surveyItemsMap) },
            hide: { $ne: true },
            inDraft: { $ne: true }
          },
          populate: {
            path: 'question'
          }
        })
        .lean(),
      Company.model
        .findOne({ _id: campaign.company })
        .lean()
    ]);

    // skip email sending if recipient unsubscribed
    if (recipient.unsubscribe) return;

    const [surveyItem] = surveySections
      .reduce((acc, { surveyItems = [] }) => [...acc, ...surveyItems], []);

    const { question } = surveyItem;

    const data = {
      unsubscribe: `${config.hostname}/unsubscribe?token=${roundResult.token}`,
      facebook: 'https://www.facebook.com/screverr',
      linkedin: 'https://www.linkedin.com/company/screver/',
      instagram: 'https://www.instagram.com/screverr/',
      home: config.hostname,
      terms: 'https://screver.com/terms-conditions/',
      privacy: 'https://screver.com/privacy-policy/',
      passTime: getPassTime(campaign.questionPerSurvey),
      signIn: 'https://app.screver.com/',
      hostname: config.hostname,
      username: _.get(recipient, 'contact.name.first'),
      companyName: company.name,
      token: roundResult.token,
      numberOfQuestions: campaign.questionPerSurvey
    };

    const customerText = {
      pulseFirstInvitation: campaign.invitationMailerCustomText,
      pulseSecondInvitation: campaign.invitationMailerCustomText
    }[mailer.type];


    if (['linearScale', 'netPromoterScore'].includes(question.type)) {
      await pulseMailerQuestionTemplateBuilder({
        survey,
        question,
        roundResult,
        surveyItem,
        data
      });
    }

    if (customerText) {
      const buffer = await fs.readFile('server/mailers/pulseMailers/customerTextBlock.html');

      data.customerTextBlock = parseTpl(buffer.toString(), { customerText }, '');
    }

    mailer.template = parseTpl(mailer.template, data, '');
    mailer.subject = parseTpl(mailer.subject, data, '');

    await mailBuilder({
      data,
      mailer,
      to: recipient.email,
      type: 'email',
      save: true,
      company
    });
  } catch (e) {
    return Promise.reject(e);
  }
}

export function getPassTime(n) {
  switch (true) {
    case (n <= 6):
      return 1;
    case (n <= 10):
      return 2;
    default:
      return 3;
  }
}
