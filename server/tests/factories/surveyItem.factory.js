import faker from 'faker';

// models
import { SurveyItem } from '../../models';

// factories
import {
  teamFactory,
  surveyFactory,
  questionFactory,
  surveySectionFactory,
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const team = options.team || await teamFactory({ company: options.company });
  const company = options.company || team.company;
  const res = {
    team: onlyId ? team._id : team,
    company: onlyId ? company._id : company,
    survey: options.survey
      || await surveyFactory({ team, company }).then(i => (onlyId ? i._id : i)),
    surveySection: options.surveySection
      || await surveySectionFactory({ team, company }).then(i => (onlyId ? i._id : i)),
    type: options.type || 'question',
    question: options.question
      || await questionFactory({ team, company }).then(i => (onlyId ? i._id : i)),
    visible: options.visible,
    hide: options.hide,
    minAnswers: options.minAnswers,
    maxAnswers: options.maxAnswers,
    textLimit: options.textLimit || 500,
    html: options.html || {},
    required: options.required,
    uuid: options.uuid || faker.lorem.word(),
    notificationMailer: options.notificationMailer,
    customAnswer: options.customAnswer,
    createdBy: options.createdBy,
    sortableId: options.sortableId,
    inDraft: options.inDraft,
    draftData: options.draftData,
    draftRemove: options.draftRemove,
    inTrash: options.inTrash,
    pulseSurveyDriver: options.pulseSurveyDriver,
    primaryPulse: options.primaryPulse,
    createdAt: options.createdAt
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await SurveyItem.model.create(await attributes(options));
}
