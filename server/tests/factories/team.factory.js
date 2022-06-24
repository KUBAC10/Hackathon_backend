import faker from 'faker';

// models
import {
  Team
} from '../../models';

// factories
import { companyFactory } from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const res = {
    company: options.company || await companyFactory({}).then(i => (onlyId ? i._id : i)),
    name: options.name || faker.lorem.word() + Math.random(),
    description: options.description || faker.lorem.words(),
    createdBy: options.createdBy
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}, onlyId) {
  return await Team.model.create(await attributes(options, onlyId));
}
