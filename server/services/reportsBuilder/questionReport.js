import _ from 'lodash';

// helpers
import overallQuestionReport from './helpers/overallQuestionReport';
import summaryQuestionReport from './helpers/summaryQuestionReport';
import rangeQuestionReport from './helpers/rangeQuestionReport';
import textQuestionReport from './helpers/textQuestionReport';

// return question reports data by type
export default async function questionReport(options = {}) {
  const { range = {}, text } = options;
  const { overall, summary } = range;
  try {
    switch (true) {
      case !_.isEmpty(text): return await textQuestionReport(options);
      case overall: return await overallQuestionReport(options);
      case summary: return await summaryQuestionReport(options);
      default: return await rangeQuestionReport(options);
    }
  } catch (e) {
    console.error('questionReport() Error:', e);
    return Promise.reject(e);
  }
}

