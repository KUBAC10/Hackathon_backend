import async from 'async';

// helpers
import buildQuery from '../../services/segments/helpers/buildQuery';
import getSurveyResultsData from '../../services/segments/helpers/getSurveyResultsData';
import summaryQuestionReport from '../../services/reportsBuilder/helpers/summaryQuestionReport';

export default async function loadSurveyReportSegments(options = {}) {
  try {
    const { surveyReport, surveyItems = [], reportItems = [], survey, range } = options;
    const { segments: filter } = surveyReport;

    if (!filter || !filter.answers || !filter.answers.length) return;

    // build query
    const query = buildQuery({ ...filter, survey, skipFilter: true, range });

    // build select
    const select = surveyItems.reduce((acc, item) => `${acc} answer.${item._id}`, '');

    // get surveyResults data
    const data = await getSurveyResultsData({ query, select });

    // get segment reports
    const result = await async.mapLimit(surveyItems, 1, (surveyItem, cb) => {
      const surveyReportItem = reportItems
        .find(i => i.surveyItem.toString() === surveyItem._id.toString());

      summaryQuestionReport({
        segmentsQuery: query,
        question: surveyItem.question,
        segments: true,
        segmentsData: data.map(d => ({ data: d[surveyItem._id] })),
        surveyItem,
        surveyReport,
        surveyReportItem
      }).then((result) => {
        cb(null, result);
      }).catch(cb);
    });

    return result;
  } catch (e) {
    return Promise.reject(e);
  }
}
