import { Trash } from '../../models';

// factories
import {
  teamFactory,
  questionFactory
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const team = options.team || await teamFactory({ company: options.company });
  const company = options.company || team.company;
  const question = options.question || await questionFactory({ team, company });
  const res = {
    team: onlyId ? team._id : team,
    company: onlyId ? company._id : company,
    type: options.type || 'question',
    question: onlyId ? question._id : question,
    surveyItem: options.surveyItem,
    contentItem: options.contentItem,
    survey: options.survey,
    gridRow: options.gridRow,
    gridColumn: options.gridColumn,
    questionItem: options.questionItem,
    stage: options.stage,
    expireDate: options.expireDate,
    createdBy: options.createdBy,
    attempts: options.attempts,
    draft: options.draft,
    createdAt: options.createdAt
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await Trash.model.create(await attributes(options));
}
