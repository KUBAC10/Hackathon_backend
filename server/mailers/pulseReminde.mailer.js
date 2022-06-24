import _ from 'lodash';

// helpers
import parseTpl from '../helpers/parse-es6-template';
import mailBuilder from '../helpers/mailBuilder';
import pulseMailerQuestionTemplateBuilder from '../helpers/pulseMailerQuestionTemplateBuilder';

// models
import {
  PulseSurveyRoundResult,
  SurveySection
} from '../models';

// config
import config from '../../config/env';

export default async function pulseReminderMailer({ campaign, mailer, data, recipient, round }) {
  try {
    if (config.env !== 'production') return false;

    // skip email sending if recipient unsubscribed
    if (recipient.unsubscribe) return;

    // load pulse survey result and get token for link and survey items map
    const pulseSurveyResult = await PulseSurveyRoundResult.model
      .findOne({
        recipient: recipient._id,
        pulseSurveyRound: round._id
      })
      .populate('survey')
      .lean();

    if (pulseSurveyResult) {
      data.unsubscribe = `${config.hostname}/api/v1/distribute/unsubscribe/${pulseSurveyResult.token}`;
      data.token = pulseSurveyResult.token;
      data.username = _.get(recipient, 'contact.name.first');

      const surveySections = await SurveySection.model
        .find({
          survey: campaign.survey,
          hide: { $ne: true },
          inDraft: { $ne: true }
        })
        .sort('sortableId')
        .populate({
          path: 'surveyItems',
          match: {
            _id: { $in: Object.keys(pulseSurveyResult.surveyItemsMap) },
            hide: { $ne: true },
            inDraft: { $ne: true }
          },
          populate: {
            path: 'question'
          }
        })
        .lean();

      const [surveyItem] = surveySections
        .reduce((acc, { surveyItems = [] }) => [...acc, ...surveyItems], []);

      const { question = {} } = surveyItem;

      if (['linearScale', 'netPromoterScore'].includes(question.type)) {
        await pulseMailerQuestionTemplateBuilder({
          question,
          surveyItem,
          data,
          survey: pulseSurveyResult.survey,
          roundResult: pulseSurveyResult,
        });
      }

      mailer.template = parseTpl(mailer.template, data, '');

      await mailBuilder({
        data,
        mailer,
        to: recipient.email,
        type: 'email',
        save: true,
        company: campaign.company
      });
    }
  } catch (e) {
    return Promise.reject(e);
  }
}
