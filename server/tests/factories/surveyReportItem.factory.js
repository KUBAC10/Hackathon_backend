// models
import { SurveyReportItem } from '../../models';

// factories
import {
  surveyReportFactory,
  surveyItemFactory, companyFactory
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const surveyReport = options.surveyReport || await surveyReportFactory({});
  const surveyItem = options.surveyItem || await surveyItemFactory({});
  const company = options.company || await companyFactory({});
  const res = {
    company,
    surveyReport: onlyId ? surveyReport._id : surveyReport,
    surveyItem: onlyId ? surveyItem._id : surveyItem,
    descriptionShow: options.descriptionShow,
    description: options.description,
    chart: options.chart,
    hide: options.hide,
    colors: options.colors
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await SurveyReportItem.model.create(await attributes(options));
}
