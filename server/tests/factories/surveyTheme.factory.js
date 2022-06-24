import faker from 'faker';

// models
import { SurveyTheme } from '../../models';

export async function attributes(options = {}, onlyId, omit = []) {
  const res = {
    company: options.company,
    team: options.team,
    type: options.type || 'user',
    name: options.name || faker.lorem.word() + Math.random(),
    font: options.font,
    mainColor: options.mainColor,
    backgroundColor: options.backgroundColor,
    opacity: options.opacity,
    progressBar: options.progressBar,
    questionNumbers: options.questionNumbers,
    createdBy: options.createdBy,
    survey: options.survey,
    draftData: options.draftData
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}, onlyId) {
  return await SurveyTheme.model.create(await attributes(options, onlyId));
}
