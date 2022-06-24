// models
import {
  DashboardItem
} from '../../models';

// factories
import {
  userFactory,
  teamFactory,
  questionFactory,
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const team = options.team || await teamFactory({ company: options.company });
  const company = options.company || team.company;
  const res = {
    user: options.user || await userFactory({}).then(i => (onlyId ? i._id : i)),
    team: onlyId ? team._id : team,
    company: onlyId ? company._id : company,
    question: options.question
      || await questionFactory({ team, company }).then(i => (onlyId ? i._id : i)),
    type: options.type || 'question',
    sortableId: options.sortableId || 0,
    survey: options.survey
  };
  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}, onlyId) {
  return await DashboardItem.model.create(await attributes(options, onlyId));
}
