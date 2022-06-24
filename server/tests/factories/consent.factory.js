// models
import {
  Consent
} from '../../models';

export async function attributes(options = {}, onlyId, omit = []) {
  const res = {
    user: options.user,
    survey: options.survey
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}, onlyId) {
  return await Consent.model.create(await attributes(options, onlyId));
}
