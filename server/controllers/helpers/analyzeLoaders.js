import _ from 'lodash';
import moment from 'moment';
import mongoose from 'mongoose';

// models
import {
  QuestionStatistic,
  SurveyResult,
  SurveyItem
} from '../../models';

// config
import config from '../../../config/env';

const toObjectId = mongoose.Types.ObjectId;

async function replies(options = {}) {
  try {
    const { timeZone = config.timezone, surveyId, targets, campaigns, tags } = options;
    let { from, to } = options;

    if (from) from = new Date(from);
    if (to) to = new Date(to);

    const $match = {
      survey: toObjectId(surveyId),
      empty: { $ne: true },
      hide: { $ne: true },
      preview: { $ne: true }
    };

    if (targets) {
      if (_.isArray(targets)) $match.target = { $in: targets.map(toObjectId) };
      if (_.isString(targets)) $match.target = toObjectId(targets);
    }

    if (campaigns) {
      if (_.isArray(campaigns)) $match.surveyCampaign = { $in: campaigns.map(toObjectId) };
      if (_.isString(campaigns)) $match.surveyCampaign = toObjectId(campaigns);
    }

    if (tags) {
      if (_.isArray(tags)) $match.tags = { $in: tags.map(toObjectId) };
      if (_.isString(tags)) $match.tags = toObjectId(tags);
    }

    const collectPrevData = from && to; // build prev data if range present in query

    // if from to not present build range by first and last result
    if (!from && !to) {
      const first = await SurveyResult.model
        .findOne($match)
        .select('createdAt')
        .sort({ createdAt: 1 })
        .lean();

      from = _.get(first, 'createdAt');
      to = moment().toDate();
    }

    // convert to moment
    from = moment(from).tz(timeZone).utc().startOf('day');
    to = moment(to).tz(timeZone).utc().endOf('day');

    // get number of days between dates
    const days = to.diff(from, 'day');
    let dateUnit = 'day'; // default unit of day to split range
    let format = '%Y-%m-%d'; // format of key in aggregate group

    // expand range if number of days to low
    if (days < 7) from = from.subtract(6 - days, 'days');

    // split and group data by weeks
    if (days > 30) {
      dateUnit = 'week';
      format = '%Y-%V';
    }

    // split and group data by months
    if (days > 90) {
      dateUnit = 'months';
      format = '%Y-%m';
    }

    let prevRange;
    // set current range
    const currRange = {
      from: from.startOf(dateUnit),
      to: to.endOf(dateUnit)
    };

    // set previous range
    if (collectPrevData) {
      const diff = currRange.to.diff(currRange.from, dateUnit);

      prevRange = {
        from: moment(currRange.from).subtract(diff + 1, dateUnit),
        to: moment(currRange.to).subtract(diff + 1, dateUnit)
      };
    }

    // set range for query by extreme values
    $match.createdAt = {
      $gte: (collectPrevData ? prevRange.from : currRange.from).toDate(),
      $lte: currRange.to.toDate(),
    };

    // load data
    const [
      rawData,
      total
    ] = await Promise.all([
      SurveyResult.model.aggregate([
        { $match },
        {
          $group: {
            _id: { $dateToString: { format, date: '$createdAt' } },
            started: { $sum: { $cond: [{ $eq: ['$empty', false] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $ifNull: ['$lastCompletedAt', false] }, 1, 0] } },
          }
        },
        {
          $project: {
            _id: 0,
            date: '$_id',
            started: 1,
            completed: 1,
            dropped: { $subtract: ['$started', '$completed'] },
            completionRate: { $multiply: [{ $divide: ['$completed', '$started'] }, 100] }
          }
        },
        {
          $sort: { date: 1 }
        }
      ]),
      SurveyResult.model
        .find(_.omit($match, ['target', 'surveyCampaign', 'createdAt', 'tags']))
        .countDocuments()
    ]);

    let prevDates;
    let prevData = [];

    // fill current data
    const currDates = _getDatesArray(currRange, dateUnit);
    const currData = _fillDatesArray(rawData, currDates, dateUnit);

    // fill previous data
    if (collectPrevData) {
      prevDates = _getDatesArray(prevRange, dateUnit);
      prevData = _fillDatesArray(rawData, prevDates, dateUnit);
    }

    // count completion rate
    const {
      started,
      completed
    } = currData.reduce((acc, d) => {
      acc.started += d.started;
      acc.completed += d.completed;

      return acc;
    }, { started: 0, completed: 0 });

    // count prev completion rate
    const {
      prevStarted,
      prevCompleted
    } = prevData.reduce((acc, d) => {
      acc.prevStarted += d.started;
      acc.prevCompleted += d.completed;

      return acc;
    }, { prevStarted: 0, prevCompleted: 0 });

    return {
      total,
      currData,
      prevData,
      started,
      completed,
      prevStarted,
      prevCompleted,
      dropped: started - completed,
      prevDropped: prevStarted - prevCompleted,
      completionRate: _.ceil((completed / started) * 100, 2)
    };
  } catch (e) {
    return Promise.reject(e);
  }
}

async function locations(options = {}) {
  try {
    const { from, to, timeZone = config.timezone, surveyId, targets, campaigns, tags } = options;

    // build ranges
    const {
      collectPrevData,
      currRange,
      prevRange
    } = await _getRanges({
      survey: surveyId,
      timeZone,
      from,
      to
    });

    const $match = {
      survey: toObjectId(surveyId),
      empty: { $ne: true },
      hide: { $ne: true },
      preview: { $ne: true },
      'location.country': { $exists: true },
      'location.city': { $exists: true }
    };

    if (targets) {
      if (_.isArray(targets)) $match.target = { $in: targets.map(toObjectId) };
      if (_.isString(targets)) $match.target = toObjectId(targets);
    }

    if (campaigns) {
      if (_.isArray(campaigns)) $match.surveyCampaign = { $in: campaigns.map(toObjectId) };
      if (_.isString(campaigns)) $match.surveyCampaign = toObjectId(campaigns);
    }

    if (tags) {
      if (_.isArray(tags)) $match.tags = { $in: tags.map(toObjectId) };
      if (_.isString(tags)) $match.tags = toObjectId(tags);
    }

    const $group = {
      _id: {
        country: '$location.country',
        city: '$location.city'
      },
      count: { $sum: 1 }
    };

    const $project = {
      _id: 0,
      city: '$_id.city',
      country: '$_id.country',
      count: '$count'
    };

    if (currRange) {
      $match.createdAt = {
        $gte: currRange.from.toDate(),
        $lte: currRange.to.toDate()
      };
    }

    let currentData = [];
    let prevData = [];

    currentData = await SurveyResult.model.aggregate([
      { $match },
      { $group },
      { $project }
    ]);

    if (collectPrevData && prevRange) {
      $match.createdAt = {
        $gte: prevRange.from.toDate(),
        $lte: prevRange.to.toDate()
      };

      prevData = await SurveyResult.model.aggregate([
        { $match },
        { $group },
        { $project }
      ]);
    }

    if (collectPrevData) {
      currentData = currentData.map((d) => {
        const prev = prevData
          .find(pd => pd.city === d.city && pd.country === d.country);

        return {
          ...d,
          prevCount: prev ? prev.count : 0
        };
      });
    }

    // group data by countries
    const cities = currentData.sort((a, b) => a.count - b.count);

    const uniqCountries = _.uniq(cities.map(c => c.country));

    const countries = uniqCountries
      .map((name) => {
        const data = cities
          .filter(city => city.country === name)
          .reduce((acc, city) => {
            acc.count += city.count;

            if (collectPrevData) acc.prevCount += city.prevCount;

            acc.cities.push(city);

            return acc;
          }, collectPrevData ? { count: 0, prevCount: 0, cities: [] } : { count: 0, cities: [] });

        return { country: name, ...data };
      })
      .sort((a, b) => a.count - b.count);

    return {
      prevData: !!collectPrevData,
      cities,
      countries
    };
  } catch (e) {
    return Promise.reject(e);
  }
}

async function devices(options = {}) {
  try {
    const { from, to, timeZone = config.timezone, surveyId, targets, campaigns, tags } = options;
    // build query
    const $match = {
      survey: toObjectId(surveyId),
      empty: { $ne: true },
      hide: { $ne: true },
      preview: { $ne: true }
    };

    // build range
    if (from && to) {
      $match.createdAt = {
        $gte: moment(from).tz(timeZone).startOf('day').toDate(),
        $lte: moment(to).tz(timeZone).endOf('day').toDate()
      };
    }

    if (targets) {
      if (_.isArray(targets)) $match.target = { $in: targets.map(toObjectId) };
      if (_.isString(targets)) $match.target = toObjectId(targets);
    }

    if (campaigns) {
      if (_.isArray(campaigns)) $match.surveyCampaign = { $in: campaigns.map(toObjectId) };
      if (_.isString(campaigns)) $match.surveyCampaign = toObjectId(campaigns);
    }

    if (tags) {
      if (_.isArray(tags)) $match.tags = { $in: tags.map(toObjectId) };
      if (_.isString(tags)) $match.tags = toObjectId(tags);
    }

    const data = await SurveyResult.model.aggregate([
      { $match },
      {
        $group: {
          _id: {
            device: '$device',
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          device: '$_id.device',
          count: '$count'
        }
      },
      {
        $sort: {
          count: 1
        }
      }
    ]);

    // create sum for calculate percent
    const sum = _.sumBy(data, 'count');

    // calculate percent for devices
    data.forEach((device) => {
      device.percent = (device.count * 100 / sum).toFixed(2);
    });

    return data;
  } catch (e) {
    return Promise.reject(e);
  }
}

async function npsStatistic(options = {}) {
  try {
    const {
      from, to,
      timeZone = config.timezone,
      surveyId,
      surveyItems = [],
      roundId,
      targets,
      campaigns,
      tags
    } = options;
    // get nps survey items
    const npsSurveyItems = await _loadNpsSurveyItems(surveyId, surveyItems);

    if (!npsSurveyItems.length) return { currData: [] };

    // question statistic filter
    const $match = {
      surveyItem: { $in: npsSurveyItems.map(i => i._id) },
      question: { $in: npsSurveyItems.map(i => i.question._id) }
    };

    if (roundId) $match.pulseSurveyRound = { $eq: toObjectId(roundId) };

    if (targets) {
      if (_.isArray(targets)) $match.target = { $in: targets.map(toObjectId) };
      if (_.isString(targets)) $match.target = toObjectId(targets);
    }

    if (campaigns) {
      if (_.isArray(campaigns)) $match.surveyCampaign = { $in: campaigns.map(toObjectId) };
      if (_.isString(campaigns)) $match.surveyCampaign = toObjectId(campaigns);
    }

    if (tags) {
      if (_.isArray(tags)) $match.tags = { $in: tags.map(toObjectId) };
      if (_.isString(tags)) $match.tags = toObjectId(tags);
    }

    // build ranges
    const {
      collectPrevData,
      currRange,
      prevRange,
      dateUnit,
      format
    } = await _getRanges({
      survey: surveyId,
      timeZone,
      from,
      to
    });

    // set range for query by extreme values
    $match.time = {
      $gte: (collectPrevData ? prevRange.from : currRange.from).toDate(),
      $lte: currRange.to.toDate(),
    };

    // init cursor
    const rawData = await QuestionStatistic.model.aggregate([
      { $match },
      {
        $group: {
          _id: { $dateToString: { format, date: '$time' } },
          data: { $push: '$data' }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          data: 1,
        }
      }
    ]);

    let prevDates;
    let prevData = [];

    // fill current data
    const currDates = _getDatesArray(currRange, dateUnit);
    const currData = _fillNpsDatesArray(rawData, currDates);

    // fill previous data
    if (collectPrevData) {
      prevDates = _getDatesArray(prevRange, dateUnit);
      prevData = _fillNpsDatesArray(rawData, prevDates);
    }

    // calculate summaries
    const {
      detractors,
      passives,
      promoters,
      sum
    } = currData.reduce((acc, data) => {
      acc.detractors += data.detractors;
      acc.passives += data.passives;
      acc.promoters += data.promoters;
      acc.sum += data.sum;

      return acc;
    }, {
      detractors: 0,
      passives: 0,
      promoters: 0,
      sum: 0
    });

    return {
      nps: ((promoters - detractors) / (detractors + passives + promoters) * 100 || 0)
        .toPrecision(3),
      detractors,
      detractorsPercent: (((detractors / sum) || 0) * 100).toPrecision(3),
      passives,
      passivesPercent: (((passives / sum) || 0) * 100).toPrecision(3),
      promoters,
      promotersPercent: (((promoters / sum) || 0) * 100).toPrecision(3),
      currData,
      prevData,
      dateUnit
    };
  } catch (e) {
    return Promise.reject(e);
  }
}

async function npsComments(options = {}) {
  try {
    const {
      timeZone = config.timezone,
      sort = 'desc',
      limit = 25,
      skip = 0,
      segmentsQuery,
      surveyItems,
      surveyId,
      value,
      from,
      to,
      roundId,
      targets,
      campaigns,
      tags
    } = options;

    // get nps survey items
    const npsSurveyItems = await _loadNpsSurveyItems(surveyId, surveyItems);

    if (!npsSurveyItems.length) return { resources: [], total: 0 };

    // build query
    const $match = {
      survey: toObjectId(surveyId),
      empty: { $ne: true },
      hide: { $ne: true },
      preview: { $ne: true },
      $or: npsSurveyItems.map((item) => {
        const condition = {};

        condition[`answer.${item._id}.customAnswer`] = { $exists: true };

        return condition;
      })
    };

    if (from || to) {
      $match.createdAt = {};

      if (from) $match.createdAt.$gte = moment(from).tz(timeZone).startOf('day').toDate();
      if (to) $match.createdAt.$lte = moment(to).tz(timeZone).endOf('day').toDate();
    }

    if (roundId) $match.pulseSurveyRound = toObjectId(roundId);

    if (targets) {
      if (_.isArray(targets) && targets.length) $match.target = { $in: targets.map(toObjectId) };
      if (_.isString(targets)) $match.target = toObjectId(targets);
    }

    if (campaigns) {
      if (_.isArray(campaigns)) $match.surveyCampaign = { $in: campaigns.map(toObjectId) };
      if (_.isString(campaigns)) $match.surveyCampaign = toObjectId(campaigns);
    }

    if (tags) {
      if (_.isArray(tags) && tags.length) $match.tags = { $in: tags.map(toObjectId) };
      if (_.isString(tags)) $match.tags = toObjectId(tags);
    }

    const filter = npsSurveyItems.reduce((acc, item) => {
      acc[`answer.${item._id}.value`] = 1;
      acc[`answer.${item._id}.customAnswer`] = 1;

      return acc;
    }, {});

    if (segmentsQuery) {
      const { $or: matchOr } = $match;
      const { $or: segmentOr } = segmentsQuery;

      delete segmentsQuery.$or;
      delete segmentsQuery.survey;

      _.merge($match, segmentsQuery);

      if (segmentOr) {
        delete $match.$or;

        $match.$and = [
          { $or: matchOr },
          { $or: segmentOr }
        ];
      }
    }

    const aggregate = [
      { $match },
      {
        $lookup: {
          from: 'Contact',
          localField: 'contact',
          foreignField: '_id',
          as: 'contact'
        }
      },
      {
        $project: {
          ...filter,
          createdAt: 1,
          contact: 1,
          _id: 1,
        }
      },
      {
        $project: {
          createdAt: 1,
          contact: { $arrayElemAt: ['$contact', 0] },
          answers: { $objectToArray: '$answer' }
        }
      },
      {
        $unwind: '$answers'
      },
      {
        $project: {
          createdAt: 1,
          contact: '$contact',
          surveyItem: '$answers.k',
          value: '$answers.v.value',
          customAnswer: '$answers.v.customAnswer'
        }
      }
    ];

    if (_.isNumber(value) || _.isArray(value)) {
      if (_.isArray(value)) aggregate.push({ $match: { value: { $in: value } } });
      if (_.isNumber(value)) aggregate.push({ $match: { value } });
    }

    const [
      data,
      total
    ] = await Promise.all([
      SurveyResult.model.aggregate([
        ...aggregate,
        {
          $sort: {
            value: { asc: 1, desc: -1 }[sort]
          }
        },
        {
          $match: { customAnswer: { $exists: true } }
        },
        {
          $skip: skip
        },
        {
          $limit: limit
        }
      ]),
      SurveyResult.model.aggregate([
        ...aggregate,
        {
          $match: { customAnswer: { $exists: true } }
        },
        {
          $group: {
            _id: 0,
            total: { $sum: 1 }
          }
        }
      ]),
    ]);

    const resources = data.map((d) => {
      d.surveyItem = npsSurveyItems.find(s => s._id.toString() === d.surveyItem);

      return d;
    });

    return {
      resources,
      total: total.length ? total[0].total : 0
    };
  } catch (e) {
    return Promise.reject(e);
  }
}

async function texAnswers({ query, skip = 0, limit = 5, surveyItem, field, targets }) {
  try {
    // apply filter on query get result where field customAnswer or value exists
    query[`answer.${surveyItem._id}.${field}`] = { $exists: true };

    if (targets) {
      if (_.isArray(targets) && targets.length) query.target = { $in: targets };
      if (_.isString(targets)) query.target = targets;
    }

    const [
      rawResources,
      total
    ] = await Promise.all([
      SurveyResult.model
        .find(query)
        .populate('contact')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      SurveyResult.model
        .find(query)
        .countDocuments()
    ]);

    const resources = rawResources.map(result => ({
      ...result,
      date: result.createdAt,
      surveyResult: result._id,
      text: result.answer[surveyItem._id][field]
    }));

    return { resources, total };
  } catch (e) {
    return Promise.reject(e);
  }
}

// handle survey results data count stats and split by days
function _fillDatesArray(data, datesArray, dateUnit) {
  return datesArray.map((date) => {
    const {
      started = 0,
      completed = 0,
      dropped = 0,
      completionRate = 0
    } = data.find(d => d.date === date.key) || {};

    return {
      date,
      dateUnit,
      started,
      completed,
      dropped,
      completionRate: _.ceil(completionRate, 2)
    };
  });
}

// return array of days by range
function _getDatesArray(range, unit) {
  const datesArray = [];
  const format = {
    day: 'YYYY-MM-DD',
    week: 'YYYY-WW',
    months: 'YYYY-MM'
  }[unit];

  for (const i = range.from; i <= range.to; i.add(1, unit)) {
    datesArray.push({
      from: i.startOf(unit).toString(),
      to: i.endOf(unit).toString(),
      key: i.format(format).toString()
    });
  }

  return datesArray;
}

// build ranges
async function _getRanges({ from, to, survey, timeZone }) {
  try {
    const collectPrevData = from && to; // build prev data if range present in query

    let prevRange;

    // if from to not present build range by first and last result
    if (!from && !to) {
      const query = {
        survey,
        empty: { $ne: true },
        hide: { $ne: true }
      };

      const [
        first,
        last
      ] = await Promise.all([
        SurveyResult.model
          .findOne(query)
          .select('createdAt')
          .sort({ createdAt: 1 })
          .lean(),
        SurveyResult.model
          .findOne(query)
          .select('createdAt')
          .sort({ createdAt: -1 })
          .lean()
      ]);

      from = _.get(first, 'createdAt');
      to = _.get(last, 'createdAt');
    }

    // convert to moment
    from = moment(from).tz(timeZone).startOf('day');
    to = moment(to).tz(timeZone).endOf('day');

    const days = to.diff(from, 'day'); // get number of days between dates

    let dateUnit = 'day'; // default unit of day to split range
    let format = '%Y-%m-%d'; // format of key in aggregate group

    // expand range if number of days to low
    if (days < 7) from = from.subtract(6 - days, 'days');

    // split and group data by weeks
    if (days > 30) {
      dateUnit = 'week';
      format = '%Y-%V';
    }

    // split and group data by months
    if (days > 90) {
      dateUnit = 'months';
      format = '%Y-%m';
    }

    // set current range
    const currRange = {
      from: from.startOf(dateUnit),
      to: to.endOf(dateUnit)
    };

    // set previous range
    if (collectPrevData) {
      const diff = currRange.to.diff(currRange.from, dateUnit);

      prevRange = {
        from: moment(currRange.from).subtract(diff + 1, dateUnit),
        to: moment(currRange.to).subtract(diff + 1, dateUnit)
      };
    }

    return {
      collectPrevData,
      currRange,
      prevRange,
      dateUnit,
      format
    };
  } catch (e) {
    /* istanbul ignore reject */
    return Promise.reject(e);
  }
}

// handle and calculate nps question statistic data
function _fillNpsDatesArray(rawData, datesArray) {
  return datesArray.map((date) => {
    const { data = [] } = rawData.find(d => d.date === date.key) || {};

    const {
      detractors,
      passives,
      promoters,
      sum,
    } = data.reduce((acc, d) => {
      // count detractors passives and promoters
      const detractors = _.sum(_.range(7).map(key => d[key] || 0));
      const passives = _.sum(_.range(7, 9).map(key => d[key] || 0));
      const promoters = _.sum(_.range(9, 11).map(key => d[key] || 0));

      acc.detractors += detractors;
      acc.passives += passives;
      acc.promoters += promoters;
      acc.sum += detractors + passives + promoters;

      return acc;
    }, {
      detractors: 0,
      passives: 0,
      promoters: 0,
      sum: 0
    });

    return {
      date,
      sum,
      nps: ((promoters - detractors) / (detractors + passives + promoters) * 100 || 0)
        .toPrecision(3),
      detractors,
      detractorsPercent: (((detractors / sum) || 0) * 100).toPrecision(3),
      passives,
      passivesPercent: (((passives / sum) || 0) * 100).toPrecision(3),
      promoters,
      promotersPercent: (((promoters / sum) || 0) * 100).toPrecision(3)
    };
  });
}

// load net promoter score survey items
async function _loadNpsSurveyItems(survey, querySurveyItem) {
  try {
    const query = {
      survey,
      type: { $in: ['question', 'trendQuestion'] },
      inDraft: { $ne: true },
      inTrash: { $ne: true }
    };

    if (querySurveyItem) {
      if (typeof querySurveyItem === 'object' && querySurveyItem.length) query._id = { $in: querySurveyItem };
      if (typeof querySurveyItem === 'string') query._id = querySurveyItem;
    }

    const surveyItems = await SurveyItem.model
      .find(query)
      .populate('question')
      .select('_id type question')
      .lean();

    return surveyItems
      .filter(surveyItem => surveyItem.question && surveyItem.question.type === 'netPromoterScore');
  } catch (e) {
    /* istanbul ignore reject */
    return Promise.reject(e);
  }
}

export default {
  replies,
  locations,
  devices,
  npsStatistic,
  npsComments,
  texAnswers
};
