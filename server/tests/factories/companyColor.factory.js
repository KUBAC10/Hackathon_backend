// models
import { CompanyColor } from '../../models';

// factories
import { companyFactory } from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const company = options.company || await companyFactory({});
  const res = {
    company: onlyId ? company._id : company,
    type: options.type,
    value: options.value || '#4712d4'
  };
  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await CompanyColor.model.create(await attributes(options));
}
