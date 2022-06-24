// models
import { PulseSurveyRound } from '../../models';

// factories
import { teamFactory } from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const team = options.team || await teamFactory({ company: options.company });
  const company = options.company || team.company;
  const res = {
    team: onlyId ? team._id : team,
    company: onlyId ? company._id : company,
    createdBy: options.createdBy,
    startDate: options.startDate,
    endDate: options.endDate,
    surveyCampaign: options.surveyCampaign,
    survey: options.survey,
    ...options
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await PulseSurveyRound.model.create(await attributes(options));
}
