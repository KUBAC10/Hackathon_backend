// models
import { Scope } from '../../models';

export async function attributes(options = {}, onlyId, omit = []) {
  const res = {
    companies: options.companies,
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await Scope.model.create(await attributes(options));
}
