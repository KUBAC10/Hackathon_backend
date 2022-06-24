import moment from 'moment';
import _ from 'lodash';

// models
import {
  QuestionStatistic,
  Country
} from '../../../models';

// helpers
import textAggregate from './textAggregate';
import text from './text';

export default async function getReportDataSplittedByRange(options = {}) {
  try {
    const { question, surveyItem, range, timeZone, baseQuestionData, prevRange, type } = options;

    // handle text question
    if (question.type === 'text') {
      // get aggregate
      const aggregate = await textAggregate({ question, surveyItem, range, timeZone });

      // get wordCloudData
      if (aggregate) {
        const wordCloudData = await text({ aggregate });

        return { ...wordCloudData, prevData: [] };
      }

      return { data: [], prevData: [] };
    }

    // handle countryList question
    if (question.type === 'countryList') {
      // get query cursor
      const cursor = _getQueryCursor({
        surveyItem: _.get(surveyItem, '_id'),
        question: question._id,
        range
      });

      // init accumulator
      const sum = {};

      // iterate cursor
      for (let result = await cursor.next(); result != null; result = await cursor.next()) {
        // sum data
        Object.keys(result.data || {})
          .forEach((key) => {
            sum[key] = (sum[key] || 0) + result.data[key];
          });
      }

      // load appropriate countries
      const countries = await Country.model
        .find({ _id: { $in: Object.keys(sum) } })
        .select('_id name localization code')
        .lean();

      // fill data
      const data = countries.map(country => ({
        ...country,
        value: sum[country._id]
      }));

      return { data, prevData: [] };
    }

    // handle netPromoterScore question
    if (question.type === 'netPromoterScore') {
      // get query cursor
      const cursor = _getQueryCursor({
        surveyItem: _.get(surveyItem, '_id'),
        question: question._id,
        range
      });

      // init accumulator
      const sum = {};
      for (let result = await cursor.next(); result != null; result = await cursor.next()) {
        // sum data
        Object.keys(result.data || {})
          .forEach((key) => {
            sum[key] = (sum[key] || 0) + result.data[key];
          });
      }

      // count detractors passives and promoters
      const detractors = _.sum(_.range(7).map(key => sum[key] || 0));
      const passives = _.sum(_.range(7, 9).map(key => sum[key] || 0));
      const promoters = _.sum(_.range(9, 11).map(key => sum[key] || 0));

      return {
        data: baseQuestionData.range.map(b => ({
          ...b,
          value: sum[b._id] || 0
        })),
        npsData: {
          nps: (promoters - detractors) / (detractors + passives + promoters) * 100,
          detractors,
          passives,
          promoters,
        },
        prevData: []
      };
    }

    // handle matrix questions
    if (['checkboxMatrix', 'multipleChoiceMatrix'].includes(question.type)) {
      // get query cursor
      const cursor = _getQueryCursor({
        surveyItem: _.get(surveyItem, '_id'),
        question: question._id,
        range
      });

      // init accumulator
      const sum = {};
      for (let result = await cursor.next(); result != null; result = await cursor.next()) {
        // sum data
        Object.keys(result.data || {})
          .forEach((key) => {
            sum[key] = (sum[key] || 0) + result.data[key];
          });
      }

      return {
        data: baseQuestionData.gridRows.map(row => ({
          _id: row._id,
          items: baseQuestionData.gridColumns.map(column => ({
            rowId: row._id,
            columnId: column._id,
            _id: column._id,
            score: column.score,
            value: sum[`${row._id}#${column._id}`] || 0
          }))
        })),
        prevData: []
      };
    }

    // init attributes from range report data getter
    const attr = { surveyItem, question, type, baseQuestionData, timeZone };

    // load data
    const [
      data,
      prevData
    ] = await Promise.all([
      _getDataArray({ range, ...attr }),
      _getDataArray({ range: prevRange, ...attr }),
    ]);

    return { data, prevData };
  } catch (e) {
    console.error(`_getReportData() Error: ${e}`);
  }
}

async function _getDataArray(options = {}) {
  try {
    const { question, surveyItem, range, type, baseQuestionData } = options;

    if (range) {
      const datesArray = _getDatesArray({ range, type });
      const cursor = _getAggregateCursor({
        surveyItem: _.get(surveyItem, '_id'),
        question: question._id,
        datesArray,
        range,
        type
      });
      const data = [];
      const dataHandler = _getDataHandler(question.type);

      for (let result = await cursor.next(); result != null; result = await cursor.next()) {
        const { _id, dataArray } = result;

        data.push({
          date: _getDate({ range, type, date: _id }),
          ...dataHandler(_sumData(dataArray), baseQuestionData)
        });
      }

      return data;
    }

    return [];
  } catch (e) {
    console.error(`_getRangeReportData() Error: ${e}`);
  }
}

// split array by type and range
function _getDatesArray(options = {}) {
  const { range, type } = options;
  const datesArray = Array.from(range.by(type)).map(m => m.toDate());

  return datesArray.map((date, index) => {
    const from = index === 0
      ? new Date(range.start)
      : moment(date).startOf(type).toDate();
    const to = datesArray.length - 1 === index
      ? new Date(range.end)
      : moment(date).endOf(type).toDate();
    return { from, to, date };
  });
}

// get cursor from aggregate
function _getAggregateCursor(options = {}) {
  const { range, datesArray, question, surveyItem } = options;
  const $match = {
    question,
    time: {
      $gte: range.start.toDate(),
      $lte: range.end.toDate()
    }
  };

  if (surveyItem) $match.surveyItem = surveyItem;

  return QuestionStatistic.model
    .aggregate([
      { $match },
      {
        $project: {
          time: 1,
          data: 1,
          range: {
            $switch: {
              branches: datesArray.map((range) => {
                const { from, to, date } = range;
                return {
                  case: { $and: [{ $gte: ['$time', from] }, { $lte: ['$time', to] }] },
                  then: date
                };
              })
            }
          }
        }
      },
      {
        $group: {
          _id: '$range',
          dataArray: { $push: '$data' }
        }
      },
      {
        $group: {
          _id: null,
          docs: { $push: '$$ROOT' },
          existedDates: {
            $push: '$_id'
          }
        }
      },
      {
        $project: {
          docs: {
            $map: {
              input: datesArray.map(d => d.date),
              as: 'rangeDate',
              in: {
                $cond: [
                  { $in: ['$$rangeDate', '$existedDates'] },
                  {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$docs',
                          as: 'doc',
                          cond: { $eq: ['$$doc._id', '$$rangeDate'] }
                        }
                      },
                      0
                    ]
                  },
                  {
                    _id: '$$rangeDate',
                    dataArray: []
                  }
                ]
              }
            }
          }
        }
      },
      {
        $unwind: '$docs'
      },
      {
        $replaceRoot: {
          newRoot: '$docs'
        }
      }
    ])
    .allowDiskUse(true)
    .cursor()
    .exec();
}

// get cursor from query
function _getQueryCursor(options = {}) {
  const { range, question, surveyItem } = options;
  const query = {
    question,
    time: {
      $gte: range.start.toDate(),
      $lte: range.end.toDate()
    }
  };

  if (surveyItem) query.surveyItem = surveyItem;

  return QuestionStatistic.model
    .find(query)
    .select('data')
    .lean()
    .cursor();
}

// get handler for statistic question data
function _getDataHandler(questionType) {
  switch (questionType) {
    case 'dropdown':
    case 'checkboxes':
    case 'multipleChoice': {
      return (rawData, base) => ({
        items: base.questionItems
          .map(b => ({ _id: b._id, value: rawData[b._id] || 0 }))
      });
    }
    case 'slider':
    case 'linearScale': {
      return (rawData) => {
        const values = Object.keys(rawData).reduce((acc, key) => {
          acc.x += parseInt(key, 10) * parseInt(rawData[key], 10);
          acc.n += parseInt(rawData[key], 10);
          return acc;
        }, { x: 0, n: 0 });

        return {
          value: _.ceil(values.x / values.n || 0, 3)
        };
      };
    }
    case 'thumbs': {
      return (rawData, base) => ({
        items: base.range.map(b => ({
          ...b,
          value: rawData[b.name] || 0
        }))
      });
    }
    default: return;
  }
}

// get date for split segment
function _getDate(options = {}) {
  const { range, type, date } = options;

  return type === 'day' || type === 'hours'
    ? moment(date).format(type === 'hours' ? 'YYYY-MM-DD HH' : 'YYYY-MM-DD')
    : {
      from: moment(date).isSameOrBefore(range.start) ? range.start : moment(date).startOf(type),
      to: moment(date).endOf(type === 'hour' ? 'hour' : 'day').isSameOrAfter(range.end) ? range.end : moment(date).endOf(type)
    };
}

// sum question StatisticData
function _sumData(dataArray) {
  return dataArray
    .reduce((acc, d) => {
      Object.keys(d).forEach((key) => {
        acc[key] = (acc[key] || 0) + d[key];
      });

      return acc;
    }, {});
}
