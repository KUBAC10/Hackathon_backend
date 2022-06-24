// models
import { QuestionStatistic } from '../../models';

// factories
import {
  questionFactory,
  surveyItemFactory
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const question = options.question || await questionFactory({});
  const surveyItem = options.surveyItem || await surveyItemFactory({ question });
  const res = {
    question,
    surveyItem,
    time: options.time,
    data: options.data,
    syncDB: options.syncDB,
    surveySection: options.surveySection,
    pulseSurveyRound: options.pulseSurveyRound,
    pulseSurveyDriver: options.pulseSurveyDriver
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await QuestionStatistic.model.create(await attributes(options));
}
