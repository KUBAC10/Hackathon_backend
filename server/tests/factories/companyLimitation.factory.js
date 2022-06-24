// models
import { CompanyLimitation } from '../../models';

// factories
import { companyFactory } from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const company = options.company || await companyFactory({});
  const res = {
    company: onlyId ? company._id : company,
    dropAt: options.dropAt,
    responses: options.responses,
    responsesHide: options.responsesHide,
    emails: options.emails,
    surveys: options.surveys,
    questions: options.questions,
    questionItems: options.questionItems,
    gridRows: options.gridRows,
    gridColumns: options.gridColumns,
    flowLogic: options.flowLogic,
    flowItems: options.flowItems,
    contentItems: options.contentItems,
    surveyReports: options.surveyReports,
    surveyReportItems: options.surveyReportItems,
    surveyCampaigns: options.surveyCampaigns,
    surveyThemes: options.surveyThemes,
    mailers: options.mailers
  };
  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await CompanyLimitation.model.create(await attributes(options));
}
