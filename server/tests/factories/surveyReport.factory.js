import faker from 'faker';

// models
import { SurveyReport } from '../../models';

// factories
import {
  companyFactory,
  surveyFactory, teamFactory
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const team = options.team || await teamFactory({ company: options.company }, onlyId);
  const company = options.company || await companyFactory({});
  const survey = options.survey || await surveyFactory({});
  const res = {
    name: options.name,
    description: options.description || faker.lorem.word(),
    lang: options.lang,
    liveData: options.liveData,
    colors: options.colors,
    default: options.default,
    range: options.range,
    from: options.from,
    to: options.to,
    company: onlyId ? company._id : company,
    team: onlyId ? team._id : team,
    survey: onlyId ? survey._id : survey,
    segments: options.segments
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await SurveyReport.model.create(await attributes(options));
}
