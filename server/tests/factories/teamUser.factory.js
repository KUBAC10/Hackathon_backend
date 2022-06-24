// models
import {
  TeamUser
} from '../../models';

// factories
import { companyFactory, teamFactory, userFactory } from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const res = {
    company: options.company || await companyFactory({}).then(i => (onlyId ? i._id : i)),
    team: options.team
      || await teamFactory({ company: options.company }).then(i => (onlyId ? i._id : i)),
    user: options.user || await userFactory({}).then(i => (onlyId ? i._id : i)),
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}, onlyId) {
  return await TeamUser.model.create(await attributes(options, onlyId));
}
