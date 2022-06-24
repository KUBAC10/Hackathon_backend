// models
import { PulseSurveyRoundResult } from '../../models';

export async function attributes(options = {}, onlyId, omit = []) {
  const res = {
    recipient: options.recipient,
    survey: options.survey,
    surveyCampaign: options.surveyCampaign,
    pulseSurveyRound: options.pulseSurveyRound,
    token: options.token,
    inviteEmailSendAt: options.inviteEmailSendAt,
    surveyItemsMap: options.surveyItemsMap
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await PulseSurveyRoundResult.model.create(await attributes(options));
}
