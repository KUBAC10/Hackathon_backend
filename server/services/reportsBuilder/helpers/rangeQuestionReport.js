// helpers
import setBaseQuestionData from './setBaseQuestionData';
import getReportRange from './getReportRange';
import getBaseReportData from './getBaseReportData';
import getReportDataSplittedByRange from './getReportDataSplittedByRange';

// return range question data
export default async function rangeQuestionReport(options = {}) {
  try {
    const { surveyItem, question, timeZone, range: requestRange, prevPeriod } = options;

    // get base question data
    const baseQuestionData = setBaseQuestionData(question, surveyItem);

    // get ranges and split type
    const { type, range, prevRange } = getReportRange({ prevPeriod, ...requestRange });

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
      getReportDataSplittedByRange({ ...attributes, prevRange })
    ]);

    // return report
    return { ...baseReportData, ...statisticData };
  } catch (e) {
    console.error('rangeQuestionReport() Error:', e);
  }
};
