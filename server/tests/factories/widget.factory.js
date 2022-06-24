import faker from 'faker';

// models
import { Widget } from '../../models';

// factories
import {
  companyFactory,
  teamFactory,
  dashboardFactory
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const company = options.company || await companyFactory({});
  const team = options.team || await teamFactory({ company });
  const dashboard = options.dashboard || await dashboardFactory({ company, team });

  const res = {
    name: options.name || faker.lorem.word(),
    description: options.description || faker.lorem.word(),
    team: onlyId ? team._id : team,
    company: onlyId ? company._id : company,
    dashboard: onlyId ? dashboard._id : dashboard,
    createdBy: options.createdBy,
    type: options.type || 'location'
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await Widget.model.create(await attributes(options));
}
