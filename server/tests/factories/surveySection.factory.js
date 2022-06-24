import faker from 'faker';
// models
import { SurveySection } from '../../models';

// factories
import {
  teamFactory,
  surveyFactory
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const team = options.team || await teamFactory({ company: options.company });
  const company = options.company || team.company;
  const res = {
    team: onlyId ? team._id : team,
    company: onlyId ? company._id : company,
    survey: options.survey
      || await surveyFactory({ team, company }).then(i => (onlyId ? i._id : i)),
    name: options.name || { en: faker.lorem.word() },
    description: options.description || { en: faker.lorem.word() },
    sortableId: options.sortableId || 0,
    uuid: options.uuid || faker.lorem.word(),
    hide: options.hide,
    inDraft: options.inDraft,
    draftData: options.draftData,
    draftRemove: options.draftRemove,
    step: options.sortableId || 0,
    pulseSurveyDriver: options.pulseSurveyDriver,
    primaryPulse: options.primaryPulse
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await SurveySection.model.create(await attributes(options));
}
