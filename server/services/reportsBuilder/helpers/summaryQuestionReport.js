import moment from 'moment';
import _ from 'lodash';

// helpers
import setBaseQuestionData from './setBaseQuestionData';
import textAggregate from './textAggregate';
import text from './text';
import getBaseReportData from './getBaseReportData';
import { analyzeLoaders } from '../../../controllers/helpers';
import buildQuery from '../../segments/helpers/buildQuery';

// models
import {
  QuestionStatistic,
  Country
} from '../../../models';

// return summary question report
export default async function summaryQuestionReport(options = {}) {
  try {
    const {
      surveyReport,
      surveyItem,
      surveyItems,
      question,
      segmentsData,
      range,
      customAnswer,
      surveyReportItem,
      segmentsQuery,
      segments
    } = options;

    // get base question data
    const baseQuestionData = setBaseQuestionData(question, surveyItem, customAnswer);

    // get base report attributes and statistic
    const [
      baseReportData,
      statisticData
    ] = await Promise.all([
      getBaseReportData({ surveyItem, question, baseQuestionData }),
      _getSummaryReportData({
        surveyReport,
        surveyItem,
        surveyItems,
        question,
        baseQuestionData,
        segmentsData,
        segments,
        range,
        surveyReportItem
      })
    ]);

    // load text answers list
    statisticData.textAnswersList = await _getTextAnswersList({
      surveyReport,
      surveyReportItem,
      segmentsQuery,
      surveyItem
    });

    // return report
    return {
      ...baseReportData,
      ...statisticData,
      prevData: []
    };
  } catch (e) {
    console.error('summaryQuestionReport() Error:', e);
  }
}

async function _getSummaryReportData(options = {}) {
  try {
    const {
      surveyReport,
      surveyItem,
      surveyItems,
      question,
      baseQuestionData,
      segmentsData,
      range,
      segments,
      surveyReportItem
    } = options;

    // do not return data for hided reports
    if (surveyReportItem && surveyReportItem.hide) return { data: [] };

    if (question.type === 'text' && segments) return { data: [] };

    if (question.type === 'text') {
      // get text aggregate
      const aggregate = await textAggregate({ question, surveyItem, reportRange: range });

      if (aggregate) return await text({ data: segmentsData, aggregate, surveyItem, question });

      return { data: [] };
    }

    // init accumulator
    const acc = { sum: 0, skipped: 0, answered: 0, skippedByFlow: 0 };

    if (segmentsData) {
      segmentsData.forEach((result) => {
        if (result.skipped > 0) acc.skipped += result.skipped;
        if (result.answered > 0) acc.answered += result.answered;
        if (result.skippedByFlow > 0) acc.skippedByFlow += result.skippedByFlow;

        // sum data
        Object.keys(result.data || {}).forEach((key) => {
          const value = result.data[key];

          acc[key] = acc[key] + value || value;
          acc.sum += value;
        });
      });
    } else {
      const query = {};

      if (question) query.question = question._id;
      if (surveyItem) query.surveyItem = surveyItem._id;
      if (surveyItems && surveyItems.length) query.surveyItem = { $in: surveyItems };

      if (range && (range.from || range.to)) {
        query.time = {};

        if (range.from) query.time.$gte = moment(range.from).startOf('day').toDate();
        if (range.to) query.time.$lte = moment(range.to).endOf('day').toDate();
      }

      if (surveyReport) {
        if (surveyReport.targets && surveyReport.targets.length) {
          query.target = { $in: surveyReport.targets };
        }

        if (surveyReport.tags && surveyReport.tags.length) {
          query.tags = { $in: surveyReport.tags };
        }
      }

      // get cursor
      const cursor = QuestionStatistic.model
        .find(query)
        .select('data skipped answered skippedByFlow')
        .lean()
        .cursor();

      // init accumulator
      for (let result = await cursor.next(); result != null; result = await cursor.next()) {
        if (result.skipped > 0) acc.skipped += result.skipped;
        if (result.answered > 0) acc.answered += result.answered;
        if (result.skippedByFlow > 0) acc.skippedByFlow += result.skippedByFlow;

        // sum data
        Object.keys(result.data || {}).forEach((key) => {
          const value = result.data[key];

          acc[key] = acc[key] + value || value;
          acc.sum += value;
        });
      }
    }

    return _handleStatisticData({
      baseQuestionData,
      questionType: question.type,
      linearScale: question.linearScale,
      acc
    });
  } catch (e) {
    console.log(`_getSummaryReportData() Error: ${e}`);
  }
}

// handle statistic data to present it in reports
async function _handleStatisticData(options = {}) {
  const {
    baseQuestionData,
    questionType,
    acc: {
      sum,
      skipped,
      answered,
      skippedByFlow,
      ...acc
    }
  } = options;

  switch (questionType) {
    case 'checkboxes':
    case 'multipleChoice':
    case 'imageChoice':
    case 'dropdown': {
      return {
        sum,
        skipped,
        answered,
        skippedByFlow,
        data: baseQuestionData.questionItems.map(b => ({
          _id: b._id,
          value: acc[b._id] || 0,
          percent: (((acc[b._id] / sum) || 0) * 100).toPrecision(3),
        }))
      };
    }
    case 'slider':
    case 'linearScale': {
      const x = Object.keys(acc).reduce((a, key) => {
        a += parseInt(key, 10) * parseInt(acc[key], 10);

        return a;
      }, 0);

      const data = baseQuestionData.range.map(b => ({
        ...b,
        value: acc[b.name] || 0,
        percent: (((acc[b.name] / sum) || 0) * 100).toPrecision(3)
      }));

      return {
        avg: x / sum || 0,
        data,
        skipped,
        answered,
        skippedByFlow,
        sum
      };
    }
    case 'checkboxMatrix':
    case 'multipleChoiceMatrix': {
      return {
        sum,
        skipped,
        answered,
        skippedByFlow,
        data: baseQuestionData.gridRows.map(row => ({
          _id: row._id,
          items: baseQuestionData.gridColumns.map(column => ({
            rowId: row._id,
            columnId: column._id,
            _id: column._id,
            score: column.score,
            value: acc[`${row._id}#${column._id}`] || 0,
            percent: (((acc[`${row._id}#${column._id}`] / sum) || 0) * 100).toPrecision(3)
          }))
        }))
      };
    }
    case 'netPromoterScore': {
      // count detractors passives and promoters
      const detractors = _.sum(_.range(7).map(key => acc[key] || 0));
      const passives = _.sum(_.range(7, 9).map(key => acc[key] || 0));
      const promoters = _.sum(_.range(9, 11).map(key => acc[key] || 0));
      const npsSum = detractors + passives + promoters;

      return {
        sum,
        skipped,
        answered,
        skippedByFlow,
        data: baseQuestionData.range.map(b => ({
          ...b,
          value: acc[b._id] || 0,
          percent: (((acc[b._id] / npsSum) || 0) * 100).toPrecision(3)
        })),
        npsData: {
          nps: (promoters - detractors) / (detractors + passives + promoters) * 100,
          detractors,
          detractorsPercent: (((detractors / npsSum) || 0) * 100).toPrecision(3),
          passives,
          passivesPercent: (((passives / npsSum) || 0) * 100).toPrecision(3),
          promoters,
          promotersPercent: (((promoters / npsSum) || 0) * 100).toPrecision(3),
        },
        prevData: []
      };
    }
    case 'thumbs': {
      return {
        sum,
        skipped,
        answered,
        skippedByFlow,
        data: baseQuestionData.range.map(b => ({
          ...b,
          value: acc[b.name] || 0,
          percent: ((acc[b.name] / sum) * 100).toPrecision(3)
        }))
      };
    }
    case 'countryList': {
      // load appropriate countries
      const countries = await Country.model
        .find({ _id: { $in: Object.keys(acc) } })
        .select('_id name localization code')
        .lean();

      // fill data
      const data = countries.map(country => ({
        ...country,
        value: acc[country._id],
        percent: ((acc[country._id] / sum) * 100).toPrecision(3)
      }));

      return {
        data,
        skipped,
        answered,
        skippedByFlow,
        sum
      };
    }
    default: return { data: [], skipped, answered, skippedByFlow };
  }
}

// load text answers list
async function _getTextAnswersList(options = {}) {
  try {
    const {
      surveyReport,
      surveyReportItem,
      surveyItem,
      segmentsQuery
    } = options;

    if (!surveyReport || !surveyItem || !surveyItem.question) return;

    if (surveyReportItem && surveyReportItem.hide) return;

    const {
      skip = 0,
      limit = 25,
      params = {}
    } = surveyReportItem || {};
    const { targets, tags } = surveyReport;

    // build query for list of text answers
    const query = buildQuery({
      survey: surveyReport.survey,
      filters: { createdAt: surveyReport.getRange() },
      ...surveyReport.segments ? surveyReport.segments || {} : {},
      skipFilter: true // skip apply segments filter on query
    });

    if (segmentsQuery) _.merge(query, segmentsQuery);

    switch (surveyItem.question.type) {
      case 'netPromoterScore': { // return net promoter score answers list
        const {
          from,
          to,
          value,
          sort = 'desc'
        } = params;

        return await analyzeLoaders.npsComments({
          surveyItems: [surveyItem._id],
          surveyId: surveyItem.survey,
          segmentsQuery,
          sort,
          from,
          to,
          value,
          skip,
          limit,
          targets,
          tags
        });
      }
      case 'text':// return text answers list
        return await analyzeLoaders.texAnswers({ query, skip, limit, surveyItem, targets, field: 'value' });
      case 'imageChoice':
      case 'checkboxes':
      case 'multipleChoice': // return custom answers list
        return await analyzeLoaders.texAnswers({ query, skip, limit, surveyItem, targets, field: 'customAnswer' });
      default:
        return;
    }
  } catch (e) {
    return Promise.reject(e);
  }
}
