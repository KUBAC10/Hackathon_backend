import { FlowItem } from '../../models';

import {
  teamFactory,
  flowLogicFactory, surveyFactory
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const team = options.team || await teamFactory({ company: options.company });
  const company = options.company || team.company;
  const res = {
    team: onlyId ? team._id : team,
    company: onlyId ? company._id : company,
    inDraft: options.inDraft,
    flowLogic: options.flowLogic || await flowLogicFactory({ company, team }),
    sortableId: options.sortableId || 0,
    questionType: options.questionType,
    condition: options.condition,
    gridRow: options.gridRow,
    gridColumn: options.gridColumn,
    questionItems: options.questionItems,
    value: options.value,
    count: options.count,
    country: options.country,
    survey: options.survey || await surveyFactory({ team, company }),
    endPage: options.endPage,
    range: options.range,
    draftData: options.draftData,
    displayLogic: options.displayLogic
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await FlowItem.model.create(await attributes(options));
}
