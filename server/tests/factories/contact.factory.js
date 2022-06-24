// models
import {
  Contact
} from '../../models';

// factories
import {
  userFactory,
  teamFactory,
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const user = options.user || await userFactory({ email: options.email });
  const team = options.team || await teamFactory({ company: options.company });
  const res = {
    name: {
      first: options.firstName || user.name.first,
      last: options.lastName || user.name.last
    } || user.name,
    email: options.email || user.email,
    phoneNumber: options.phoneNumber || user.phoneNumber,
    user: onlyId ? user._id : user,
    team: onlyId ? team._id : team,
    company: options.company || team.company,
    createdBy: options.createdBy
  };
  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}, onlyId) {
  return await Contact.model.create(await attributes(options, onlyId));
}
