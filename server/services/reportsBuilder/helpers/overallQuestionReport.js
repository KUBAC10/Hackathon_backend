import _ from 'lodash';

// helpers
import setBaseQuestionData from './setBaseQuestionData';
import getReportRange from './getReportRange';

// models
import { QuestionStatistic, } from '../../../models';

// helpers
import getReportDataSplittedByRange from './getReportDataSplittedByRange';
import getBaseReportData from './getBaseReportData';

// return range question data
export default async function overallQuestionReport(options = {}) {
  try {
    const { surveyItem, question, timeZone } = options;

    // get base question data
    const baseQuestionData = setBaseQuestionData(question, surveyItem);

    // get overall range
    const { range, type } = await _getOverallRange({
      surveyItem: _.get(surveyItem, '_id'),
      question: question._id,
      isTextQuestion: question.type === 'text'
    });

    // set attributes
    const attributes = {
      surveyItem,
      question,
      range,
      type,
      timeZone,
      baseQuestionData
    };

    // get base report attributes and statistic
    const [
      baseReportData,
      statisticData
    ] = await Promise.all([
      getBaseReportData(attributes),
      getReportDataSplittedByRange(attributes)
    ]);

    // return report
    return { ...baseReportData, ...statisticData };
  } catch (e) {
    console.error('rangeQuestionReport() Error:', e);
  }
};

// get range from overall report
async function _getOverallRange(options = {}) {
  const { isTextQuestion } = options;

  if (isTextQuestion) return { overall: true };

  const query = _.pick(options, ['question', 'surveyItem']);

  // get first last
  const [first, last] = await QuestionStatistic.model.getFirstLast(query);

  // get ranges and split type
  return getReportRange({ from: _.get(first, 'time'), to: _.get(last, 'time') });
}
