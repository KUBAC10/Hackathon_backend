// models
import { TagEntity } from '../../models';

// factories
import {
  companyFactory,
  tagFactory,
  contactFactory
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const company = options.company
    || await companyFactory({ company: options.company }).then(i => (onlyId ? i._id : i));
  const res = {
    company,
    tag: options.tag || await tagFactory({ company }).then(i => (onlyId ? i._id : i)),
    contact: options.contact
      || ((options.question || options.survey || options.template)
        ? undefined
        : await contactFactory({ company }).then(i => (onlyId ? i._id : i))),
    question: options.question,
    survey: options.survey,
    template: options.template,
    createdBy: options.createdBy
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await TagEntity.model.create(await attributes(options));
}
