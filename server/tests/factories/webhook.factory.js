// models
import {
  Webhook
} from '../../models';

// factories
import { companyFactory } from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const company = options.company || await companyFactory({});
  const res = {
    company,
    secret: options.secret,
    url: options.url || '/api/v1/test-webhook',
    type: options.type || '*'
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}, onlyId) {
  return await Webhook.model.create(await attributes(options, onlyId));
}
