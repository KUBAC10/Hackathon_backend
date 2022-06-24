import faker from 'faker';

// models
import { Tag } from '../../models';

// factories
import { teamFactory } from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const team = options.team || await teamFactory({ company: options.company });
  const company = options.company || team.company;
  const res = {
    name: options.name || faker.lorem.word() + Math.random(),
    description: options.description || faker.lorem.word(),
    team: onlyId ? team._id : team,
    company: onlyId ? company._id : company,
    createdBy: options.createdBy
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await Tag.model.create(await attributes(options));
}
