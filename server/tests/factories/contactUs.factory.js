import faker from 'faker';

// models
import { ContactUs } from '../../models';

export async function attributes(options = {}) {
  return {
    name: options.name || faker.lorem.word(),
    email: options.email || faker.internet.email(),
    lang: options.lang || 'en',
    comment: options.comment || faker.lorem.word()
  };
}

export default async function (options = {}) {
  return await ContactUs.model.create(await attributes(options));
}
