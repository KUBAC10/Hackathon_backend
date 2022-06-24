import { DisplayLogic } from '../../models';

import {
  teamFactory,
  surveyItemFactory,
  surveyFactory
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const team = options.team || await teamFactory({ company: options.company });
  const company = options.company || team.company;
  const survey = options.survey || await surveyFactory({ company, team });
  const res = {
    team: onlyId ? team._id : team,
    company: onlyId ? company._id : company,
    survey: onlyId ? survey._id : survey,
    draftRemove: options.draftRemove,
    inDraft: options.inDraft,
    surveyItem: options.surveyItem || await surveyItemFactory({ team, company }),
    conditionSurveyItem: options.conditionSurveyItem,
    method: options.method || 'some',
    sortableId: options.sortableId || 0,
    draftData: options.draftData,
    display: options.display
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await DisplayLogic.model.create(await attributes(options));
}
