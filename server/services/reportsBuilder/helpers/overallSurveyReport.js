import async from 'async';
import moment from 'moment';

// helpers
import setEntityNames from './setEntityNames';
import getReportRange from './getReportRange';
import overallQuestionReport from './overallQuestionReport';

// models
import { SurveyResult } from '../../../models';

// return overall survey reports
export default async function overallSurveyReport(options = {}) {
  try {
    try {
      const { survey, timeZone } = options;

      // build query
      const query = { survey: survey._id };

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
      const [first, last] = await Promise.all([
        SurveyResult.model
          .findOne(query)
          .select('createdAt')
          .sort({ createdAt: 1 })
          .lean(),
        SurveyResult.model
          .findOne(query)
          .select('createdAt')
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      const { type, range } = await getReportRange({
        timeZone,
        from: first ? first.createdAt : moment().startOf('day'),
        to: last ? last.createdAt : moment().endOf('day')
      });
      // get surveyItems
      const surveyItems = survey.surveySections
        .reduce((acc, section) => [...acc, ...section.surveyItems], []);

      // set date
      result.date = type === 'hours'
        ? moment(range.start).tz(timeZone).format('YYYY-MM-DD')
        : {
          from: moment(range.start).tz(timeZone).format('YYYY-MM-DD'),
          to: moment(range.end).tz(timeZone).format('YYYY-MM-DD')
        };

      // collect data by each question
      result.reports = await async.mapLimit(surveyItems, 5, (surveyItem, cb) => {
        overallQuestionReport({
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
