import async from 'async';
import moment from 'moment';

// helpers
import setEntityNames from './setEntityNames';
import getReportRange from './getReportRange';
import rangeQuestionReport from './rangeQuestionReport';

export default async function overallSurveyReport(options = {}) {
  try {
    try {
      const { survey, timeZone, range, prevPeriod } = options;

      // base result
      const result = {
        date: {},
        survey: {
          name: setEntityNames(survey),
          _id: survey._id
        },
        reports: []
      };

      // get first and last survey result items of given question to get overall range
      const { type, range: currentRange } = await getReportRange({ timeZone, range, prevPeriod });

      // load surveyItems
      const surveyItems = survey.surveySections
        .reduce((acc, section) => [...acc, ...section.surveyItems], []);

      // set date
      result.date = type === 'hours'
        ? moment(currentRange.start).tz(timeZone).format('YYYY-MM-DD')
        : {
          from: moment(currentRange.start).tz(timeZone).format('YYYY-MM-DD'),
          to: moment(currentRange.end).tz(timeZone).format('YYYY-MM-DD')
        };

      // collect data by each question
      result.reports = await async.mapLimit(surveyItems, 5, (surveyItem, cb) => {
        rangeQuestionReport({
          prevPeriod,
          range,
          timeZone,
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
