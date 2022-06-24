import faker from 'faker';

// helpers
import setLocalizationAttributes from './setLocalizationAttributes';

// models
import {
  GridColumn
} from '../../models';

// factories
import {
  teamFactory,
  questionFactory,
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const team = options.team || await teamFactory({ company: options.company });
  const company = options.company || team.company;
  const translation = options.translation || { en: true };
  const res = {
    translation,
    team: onlyId ? team._id : team,
    company: onlyId ? company._id : company,
    question: options.question
      || await questionFactory({ team, company }).then(i => (onlyId ? i._id : i)),
    name: options.name || setLocalizationAttributes(options, 'name'),
    uuid: options.uuid || faker.lorem.word(),
    score: options.score || 0,
    inDraft: options.inDraft,
    draftData: options.draftData,
    draftRemove: options.draftRemove,
    sortableId: options.sortableId
  };
  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}, onlyId) {
  return await GridColumn.model.create(await attributes(options, onlyId));
}
