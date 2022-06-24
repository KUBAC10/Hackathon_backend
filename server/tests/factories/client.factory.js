import faker from 'faker';

// models
import { Client } from '../../models';

// factories
import { companyFactory } from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const company = options.company || await companyFactory({});
  const res = {
    name: options.name || faker.lorem.word(),
    company: onlyId ? company._id : company,
    clientId: options.clientId || 'clientId',
    clientSecret: options.clientSecret || 'clientSecret',
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await Client.model.create(await attributes(options));
}
