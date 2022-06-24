import moment from 'moment';
import _ from 'lodash';

// helpers
import setEntityNames from './setEntityNames';

export default async function getBaseReportData(options = {}) {
  const { surveyItem, question, range, type, timeZone, baseQuestionData } = options;

  // init base
  const base = {
    _id: _.get(surveyItem, '_id'),
    question: {
      surveyItem: _.get(surveyItem, '_id'),
      name: setEntityNames(question),
      type: question.type,
      input: question.input,
      _id: question._id,
      dateParams: question.dateParams,
      ...baseQuestionData
    },
    date: moment().format('YYYY-MM-DD')
  };

  if (range) {
    base.date = type === 'hours'
      ? moment(range.start).tz(timeZone).format('YYYY-MM-DD')
      :
      {
        from: moment(range.start).tz(timeZone).format('YYYY-MM-DD'),
        to: moment(range.end).tz(timeZone).format('YYYY-MM-DD')
      };
  }

  return base;
}
