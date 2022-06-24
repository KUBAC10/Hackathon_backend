import uuid from 'uuid/v4';

// models
import {
  Invite
} from '../../models';

// factories
import {
  teamFactory,
  contactFactory,
  surveyFactory,
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const team = options.team || await teamFactory({ company: options.company });
  const company = options.company || team.company;
  const res = {
    team,
    company,
    contact: options.contact || await contactFactory({ team }),
    survey: options.survey || await surveyFactory({ team, company }),
    token: options.token || uuid(),
    meta: options.meta,
    ttl: options.ttl,
    user: options.user,
    type: options.type,
    preview: options.preview,
    createdBy: options.createdBy,
    createdAt: options.createdAt,
    target: options.target
  };
  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}, onlyId) {
  return await Invite.model.create(await attributes(options, onlyId));
}
