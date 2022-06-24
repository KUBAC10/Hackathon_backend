// models
import { SurveyResult } from '../../../models';

// helpers
import handleSurveyResultData from '../../../helpers/handleSurveyResultData';

/**
 * Get survey results data
 * @param {object} [options] options
 * @param {object} [data] data
 * @param  {object} [options.query] - Query
 * @param  {string} [options.select] - Select
 * @return {array} [{surveyItemId:{questionItemId:2}}] - Number of answers on questionItem
 */
export default async function getSurveyResultsData(options = {}, data = {}) {
  try {
    const { query, select, skip = 0, limit = 1000 } = options;

    const results = await SurveyResult.model
      .find(query)
      .skip(skip)
      .limit(limit)
      .select(select)
      .lean();

    if (results && results.length) {
      results.forEach((res) => {
        handleSurveyResultData(res, data);
      });

      options.skip = skip + limit;

      return await getSurveyResultsData(options, data);
    }

    return [data];
  } catch (e) {
    console.error('_recursiveGetSurveyResults() Error:', e);
  }
}
