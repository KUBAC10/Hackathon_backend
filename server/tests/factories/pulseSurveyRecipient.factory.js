import faker from 'faker';

// models
import { PulseSurveyRecipient } from '../../models';

export async function attributes(options = {}, onlyId, omit = []) {
  const company = options.company;
  const res = {
    email: options.email || faker.internet.email().toLowerCase(),
    company: onlyId ? company._id : company,
    createdBy: options.createdBy,
    surveyCampaign: options.surveyCampaign,
    survey: options.survey,
    surveyItemsMap: options.surveyItemsMap || {}
  };

  if (omit.length) omit.forEach(k => delete res[k]);

  return res;
}

export default async function (options = {}) {
  return await PulseSurveyRecipient.model.create(await attributes(options));
}
