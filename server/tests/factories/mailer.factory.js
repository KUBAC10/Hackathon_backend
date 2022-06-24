import faker from 'faker';

// models
import {
  Mailer
} from '../../models';

export async function attributes(options = { subject: {}, template: {} }, onlyId, omit = []) {
  const subject = options.subject || '';
  const template = options.template || '';
  const type = options.type || 'base';
  const res = {
    subject,
    template,
    type,
    name: options.name || faker.lorem.word() + Math.random(),
    company: options.company,
    globalMailer: options.globalMailer
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await Mailer.model.create(await attributes(options));
}
