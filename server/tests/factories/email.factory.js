import faker from 'faker';

// models
import {
  Email
} from '../../models';

// factories
import userFactory from './user.factory';
import mailerFactory from './mailer.factory';

export async function attributes(options = {}, onlyId, omit = []) {
  const res = {
    name: options.name || faker.lorem.word() + Math.random(),
    company: options.company,
    team: options.team,
    type: options.type || 'email',
    user: options.user || await userFactory({}).then(i => (onlyId ? i._id.toString() : i)),
    to: options.to || 'example@email.com',
    mailer: options.mailer || await mailerFactory({}).then(i => (onlyId ? i._id.toString() : i)),
    data: options.data || JSON.stringify({})
  };
  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}, onlyId) {
  return await Email.model.create(await attributes(options, onlyId));
}
