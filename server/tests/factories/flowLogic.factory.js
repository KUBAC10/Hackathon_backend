import { FlowLogic } from '../../models';

import {
  teamFactory,
  surveyItemFactory
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const team = options.team || await teamFactory({ company: options.company });
  const company = options.company || team.company;
  const res = {
    team: onlyId ? team._id : team,
    company: onlyId ? company._id : company,
    inDraft: options.inDraft,
    surveyItem: options.surveyItem || await surveyItemFactory({ team, company }),
    method: options.method || 'some',
    action: options.action || 'endSurvey',
    section: options.section,
    sortableId: options.sortableId || 0,
    draftData: options.draftData
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await FlowLogic.model.create(await attributes(options));
}
