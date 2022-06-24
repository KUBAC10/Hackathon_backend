import faker from 'faker';

// models
import {
  User
} from '../../models';

// factories
import { companyFactory, teamFactory } from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const company = options.company || await companyFactory({});
  const currentTeam = options.currentTeam || await teamFactory({ company });
  const res = {
    company,
    password: options.password || '12312312',
    email: options.email || faker.internet.email().toLowerCase(),
    phoneNumber: options.phoneNumber ||
      faker.random.number().toString() + Math.floor(Math.random() * 11),
    name: {
      first: options.firstName || faker.name.firstName(),
      last: options.lastName || faker.name.lastName()
    },
    isLite: options.isLite || undefined,
    isAdmin: options.isAdmin || undefined,
    isPowerUser: options.isPowerUser || undefined,
    fakeDataAccess: options.fakeDataAccess || undefined,
    isTemplateMaker: options.isTemplateMaker || undefined,
    createdAt: options.createdAt || undefined,
    defaultLanguage: options.defaultLanguage || 'en',
    tableColumnSettings: options.tableColumnSettings,
    acceptedAt: options.acceptedAt,
    currentTeam,
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}, onlyId) {
  return await User.model.create(await attributes(options, onlyId));
}
