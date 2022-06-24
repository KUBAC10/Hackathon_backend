import chalk from 'chalk';
import overallSurveyReport from './helpers/overallSurveyReport';
import summarySurveyReport from './helpers/summarySurveyReport';
import rangeSurveyReport from './helpers/rangeSurveyReport';

// return survey reports data by type
export default async function surveyReport(options = {}) {
  try {
    const { overall, summary } = options.range;

    switch (true) {
      case overall: return await overallSurveyReport(options);
      case summary: return await summarySurveyReport(options);
      default: return await rangeSurveyReport(options);
    }
  } catch (e) {
    console.log(chalk.red(`surveyReport error: ${e}`));
    return Promise.reject(e);
  }
}
