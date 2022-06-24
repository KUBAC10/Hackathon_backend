import faker from 'faker';

// models
import { ContentItem } from '../../models';

// factories
import {
  teamFactory,
  surveyFactory
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const team = options.team || await teamFactory({ company: options.company });
  const company = options.company || team.company;
  const res = {
    team,
    company,
    survey: options.survey || await surveyFactory({ company, team }),
    surveyItem: options.surveyItem,
    contentType: 'text',
    type: options.type || 'content',
    text: options.text || { en: faker.lorem.word() },
    html: options.html,
    default: options.default,
    sortableId: options.sortableId,
    draftData: options.draftData,
    inDraft: options.inDraft,
    inTrash: options.inTrash
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await ContentItem.model.create(await attributes(options));
}
