// models
import { SurveyResult } from '../../models';

// factories
import {
  teamFactory,
  surveyFactory
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const team = options.team || await teamFactory({ company: options.company });
  const company = options.company || team.company;
  const res = {
    survey: options.survey || await surveyFactory({ team, company }),
    team: onlyId ? team._id : team,
    company: onlyId ? company._id : company,
    contact: options.contact,
    step: options.step,
    token: options.token || 'testToken',
    completed: options.completed,
    startedAt: options.startedAt,
    fingerprintId: options.fingerprintId,
    assets: options.assets || [],
    meta: options.meta,
    fake: options.fake,
    stepHistory: options.stepHistory,
    quizCorrect: options.quizCorrect,
    quizTotal: options.quizTotal,
    answer: options.answer,
    createdAt: options.createdAt,
    empty: options.empty,
    preview: options.preview,
    questionStepHistory: options.questionStepHistory,
    hide: options.hide,
    location: options.location,
    device: options.device,
    pulseSurveyRound: options.pulseSurveyRound,
    recipient: options.recipient
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await SurveyResult.model.create(await attributes(options));
}
