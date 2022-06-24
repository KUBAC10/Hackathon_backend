// helpers
import setLocalizationAttributes from './setLocalizationAttributes';

// models
import {
  Question
} from '../../models';

// factories
import {
  teamFactory,
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const team = options.team || await teamFactory({ company: options.company });
  const company = options.company || team.company;
  const translation = options.translation || { en: true };
  const res = {
    translation,
    team: onlyId ? team._id : team,
    company: onlyId ? company._id : company,
    type: options.type || 'text',
    name: options.name || setLocalizationAttributes(options, 'name'),
    linearScale: {
      from: options.from,
      fromCaption: options.fromCaption,
      to: options.to,
      toCaption: options.toCaption,
      icon: options.icon
    },
    description: options.description,
    trend: options.trend,
    general: options.general,
    configuration: options.configuration,
    placeholder: options.placeholder,
    createdBy: options.createdBy,
    inDraft: options.inDraft,
    draftData: options.draftData,
    draftRemove: options.draftRemove,
    quiz: options.quiz,
    quizCorrectText: options.quizCorrectText,
    quizIncorrectText: options.quizIncorrectText,
    input: options.input,
    textComment: options.textComment,
    detractorsComment: options.detractorsComment,
    passivesComment: options.passivesComment,
    promotersComment: options.promotersComment,
    detractorsPlaceholder: options.detractorsPlaceholder,
    passivesPlaceholder: options.passivesPlaceholder,
    promotersPlaceholder: options.promotersPlaceholder,
    quizCorrectValue: options.quizCorrectValue,
    quizCondition: options.quizCondition,
    quizCorrectRange: options.quizCorrectRange,
    defaultCode: options.defaultCode,
    primaryPulse: options.primaryPulse,
    pulse: options.pulse,
    scoreObj: options.scoreObj
  };
  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}, onlyId) {
  return await Question.model.create(await attributes(options, onlyId));
}
