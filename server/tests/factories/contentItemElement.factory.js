import faker from 'faker';

// models
import { ContentItemElement } from '../../models';

// factories
import {
  companyFactory,
  contentItemFactory
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const company = options.company || await companyFactory({ company: options.company });
  const contentItem = options.contentItem || await contentItemFactory({ company: options.company });

  const res = {
    company: onlyId ? company._id : company,
    contentItem: onlyId ? contentItem._id : contentItem,
    type: options.type || 'link',
    value: options.value || faker.lorem.word(),
    link: options.link || faker.lorem.word(),
    linkText: options.linkText || { en: faker.lorem.word() }
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await ContentItemElement.model.create(await attributes(options));
}
