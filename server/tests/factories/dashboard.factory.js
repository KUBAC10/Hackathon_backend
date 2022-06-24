import faker from 'faker';

// models
import { Dashboard } from '../../models';

// factories
import {
  companyFactory,
  teamFactory
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const company = options.company || await companyFactory({});
  const team = options.team || await teamFactory({ company });
  const res = {
    name: options.name || faker.lorem.word(),
    description: options.description || faker.lorem.word(),
    team: onlyId ? team._id : team,
    company: onlyId ? company._id : company,
    createdBy: options.createdBy
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await Dashboard.model.create(await attributes(options));
}
