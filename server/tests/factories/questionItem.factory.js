// helpers
import setLocalizationAttributes from './setLocalizationAttributes';

// models
import {
  QuestionItem
} from '../../models';

// factories
import {
  teamFactory,
  questionFactory,
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const team = options.team || await teamFactory({ company: options.company });
  const company = options.company || team.company;
  const translationLock = options.translationLock || { en: true };
  const res = {
    translationLock,
    team: onlyId ? team._id : team,
    company: onlyId ? company._id : company,
    question: options.question
      || await questionFactory({ team, company }).then(i => (onlyId ? i._id : i)),
    name: options.name || setLocalizationAttributes(options, 'name'),
    inDraft: options.inDraft,
    inTrash: options.inTrash,
    draftData: options.draftData,
    draftRemove: options.draftRemove,
    quizResultText: options.quizResultText,
    sortableId: options.sortableId,
    quizCorrect: options.quizCorrect,
    score: options.score
  };
  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}, onlyId) {
  return await QuestionItem.model.create(await attributes(options, onlyId));
}
