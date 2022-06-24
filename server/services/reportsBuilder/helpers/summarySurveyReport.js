import async from 'async';

// helpers
import setEntityNames from './setEntityNames';
import summaryQuestionReport from './summaryQuestionReport';

// return summary survey report
export default async function summarySurveyReport(options = {}) {
  try {
    try {
      const { survey } = options;
      // base result
      const result = {
        date: {},
        survey: {
          name: setEntityNames(survey),
          _id: survey._id
        },
        reports: []
      };
      // get surveyItems
      const surveyItems = survey.surveySections
        .reduce((acc, section) => [...acc, ...section.surveyItems], []);
      // collect data by each question
      result.reports = await async.mapLimit(surveyItems, 5, (surveyItem, cb) => {
        summaryQuestionReport({
          surveyItem,
          question: surveyItem.question,
        }).then(data => cb(null, data)).catch(cb);
      });

      return result;
    } catch (e) {
      return Promise.reject(e);
    }
  } catch (e) {
    console.error('overallSurveyReport() Error', e);
  }
}
