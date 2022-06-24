import faker from 'faker';

// models
import { Target } from '../../models';

// factories
import {
  teamFactory,
  surveyFactory
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const team = options.team || await teamFactory({ company: options.company });
  const company = options.company || team.company;
  const res = {
    name: options.name || faker.lorem.word() + Math.random(),
    team: onlyId ? team._id : team,
    company: onlyId ? company._id : company,
    survey: options.survey || await surveyFactory({ team, company }),
    status: options.status,
    token: options.token
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await Target.model.create(await attributes(options));
}
