import httpStatus from 'http-status';
import async from 'async';
import _ from 'lodash';

// models
import {
  Survey,
  AnalyticNotification,
  PulseSurveyDriver,
  QuestionStatistic,
  PulseSurveyRound
} from '../../../models';

// helpers
import { hasAccess, analyzeLoaders } from '../../helpers';
import massCorrelation from '../../helpers/massCorrelation';
import getSurveyStats from '../../helpers/getSurveyStats';

// config
import config from '../../../../config/env';

/** GET /api/v1/advanced-analyze/surveys/:id/replies - get analytic by survey responses */
async function replies(req, res, next) {
  try {
    const { timeZone = config.timezone } = req.cookies;
    const { id } = req.params;
    const { from, to, targets, campaigns, tags } = req.query;

    // load survey to check access
    const survey = await Survey.model
      .findById(id)
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const data = await analyzeLoaders.replies({
      from,
      to,
      timeZone,
      targets,
      campaigns,
      tags,
      surveyId: survey._id
    });

    return res.send(data);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/advanced-analyze/surveys/:id/locations - get location analytic */
async function locations(req, res, next) {
  try {
    const { timeZone = config.timezone } = req.cookies;
    const { id } = req.params;
    const { from, to, targets, campaigns, tags } = req.query;

    // load survey to check access
    const survey = await Survey.model
      .findById(id)
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const data = await analyzeLoaders.locations({
      from,
      to,
      timeZone,
      targets,
      campaigns,
      tags,
      surveyId: survey._id
    });

    return res.send(data);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/advanced-analyze/surveys/:id/device - get data about user devices */
async function devices(req, res, next) {
  try {
    const { timeZone = config.timezone } = req.cookies;
    const { id } = req.params;
    const { from, to, targets, campaigns, tags } = req.query;

    // load survey
    const survey = await Survey.model
      .findById(id)
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    // check access
    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const data = await analyzeLoaders.devices({
      from,
      to,
      timeZone,
      targets,
      campaigns,
      tags,
      surveyId: survey._id
    });

    return res.send(data);
  } catch (e) {
    return next(e);
  }
}

/** GET /api/v1/advanced-analyze/surveys/:id/dependency - calculate correlation coefficients */
async function dependency(req, res, next) {
  try {
    const { timeZone = config.timezone } = req.cookies;
    const { id } = req.params;
    const { from, to, correlationDirection, targets, campaigns, tags } = req.query;

    const survey = await Survey.model
      .findOne({ _id: id })
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // get correlation coefficients
    let response = await massCorrelation({ survey, from, to, timeZone, targets, campaigns, tags });

    // filter response
    if (correlationDirection) {
      const condition = {
        positive (entity) { return entity.correlation > 0; },
        negative (entity) { return entity.correlation < 0; }
      };

      response = response.filter(condition[correlationDirection]);
    }

    // sort responses in ascending order
    response.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

    return res.send(response);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/advanced-analyze/surveys/:id/nps-statistic - nps questions statistic */
async function npsStatistic(req, res, next) {
  try {
    const { timeZone = config.timezone } = req.cookies;
    const { id } = req.params;
    const { from, to, surveyItems = [], roundId, targets, campaigns, tags } = req.query;

    // load survey to check access
    const survey = await Survey.model
      .findById(id)
      .lean();

    if (!survey) return res.status(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const data = await analyzeLoaders.npsStatistic({
      from,
      to,
      timeZone,
      surveyItems,
      roundId,
      targets,
      campaigns,
      tags,
      surveyId: survey._id
    });

    return res.send(data);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/advanced-analyze/surveys/:id/nps-comments - net promoter score comments */
async function npsComments(req, res, next) {
  try {
    const { timeZone = config.timezone } = req.cookies;
    const { id } = req.params;
    const {
      from,
      to,
      surveyItems,
      value,
      skip = 0,
      limit = 25,
      sort = 'desc',
      roundId,
      targets,
      campaigns,
      tags
    } = req.query;

    // load survey to check access
    const survey = await Survey.model
      .findById(id)
      .lean();

    if (!survey) return res.status(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const data = await analyzeLoaders.npsComments({
      timeZone,
      surveyId: survey._id,
      from,
      to,
      surveyItems,
      value,
      skip,
      limit,
      sort,
      roundId,
      targets,
      campaigns,
      tags
    });

    return res.send(data);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/advanced-analyze/surveys/:id/insights - return analytic notifications */
async function insights(req, res, next) {
  try {
    const { id } = req.params;
    const { skip = 0, limit = 10 } = req.query;
    const { companyId: company, currentTeam: team } = req.user;

    const query = {
      company,
      survey: id
    };

    if (team) query.team = team;

    const [
      resources,
      total
    ] = await Promise.all([
      AnalyticNotification.model
        .find(query)
        .populate([
          {
            path: 'questionItem'
          },
          {
            path: 'country'
          },
          {
            path: 'surveyItem',
            populate: 'question'
          },
          {
            path: 'left.surveyItem',
            populate: 'question'
          },
          {
            path: 'left.questionItem'
          },
          {
            path: 'right.surveyItem',
            populate: 'question'
          },
          {
            path: 'right.questionItem'
          }
        ])
        .skip(skip)
        .limit(limit)
        .lean(),
      AnalyticNotification.model
        .find(query)
        .countDocuments()
    ]);

    return res.send({ resources, total });
  } catch (e) {
    return next(e);
  }
}

/** GET /api/v1/advanced-analyze/:surveyId/driver/:pulseSurveyDriverId - driver report */
async function driverReport(req, res, next) {
  try {
    const { surveyId, pulseSurveyDriverId } = req.params;
    const { roundId, tags } = req.query;

    // load survey to check access
    const survey = await Survey.model
      .findById(surveyId)
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const pulseSurveyDriver = await PulseSurveyDriver.model
      .findOne({
        _id: pulseSurveyDriverId,
        inDraft: { $ne: true },
        inTrash: { $ne: true }
      })
      .populate({
        path: 'surveySections',
        match: {
          inDraft: { $ne: true },
          inTrash: { $ne: true },
          hide: { $ne: true }
        },
        populate: {
          path: 'surveyItems',
          match: {
            type: { $in: ['question', 'trendQuestion'] },
            inDraft: { $ne: true },
            inTrash: { $ne: true },
            hide: { $ne: true }
          },
          populate: {
            path: 'question'
          }
        }
      })
      .lean();

    if (!pulseSurveyDriver) return res.sendStatus(httpStatus.NOT_FOUND);

    // filter nps survey items
    pulseSurveyDriver.surveySections = pulseSurveyDriver.surveySections
      .map((section) => {
        section.surveyItems = section.surveyItems
          .filter(item => item.question.type !== 'netPromoterScore');

        return section;
      })
      .filter(section => section.surveyItems.length);

    // init accumulator for driver
    const acc = { sum: 0, n: 0 };

    pulseSurveyDriver.surveySections.forEach((section) => {
      acc[section._id] = { sum: 0, n: 0 };

      section.surveyItems.forEach((item) => {
        acc[section._id][item._id] = { sum: 0, n: 0 };
      });
    });

    // get survey items
    const surveyItems = pulseSurveyDriver.surveySections
      .reduce((acc, section) => [...acc, ...section.surveyItems], []);

    const filters = {};

    if (roundId) filters.pulseSurveyRound = roundId;
    if (tags) {
      if (_.isArray(tags)) filters.tags = { $all: tags };
      if (_.isString(tags)) filters.tags = tags;
    }

    // collect data by survey items
    await async.eachLimit(surveyItems, 5, statisticHandler(acc, filters));

    // calculate and set average values
    pulseSurveyDriver.surveySections.forEach((section) => {
      section.subDriverAvg = ((acc[section._id].sum / acc[section._id].n) || 0).toPrecision(3);

      section.surveyItems.forEach((item) => {
        item.questionAvg = (
          (acc[section._id][item._id].sum / acc[section._id][item._id].n) || 0
        ).toPrecision(3);
      });
    });

    pulseSurveyDriver.driverAvg = ((acc.sum / acc.n) || 0).toPrecision(3);

    return res.send(pulseSurveyDriver);
  } catch (e) {
    return next(e);
  }
}

// TODO rework
/** GET /api/v1/advanced-analyze/surveys/:id/pulse-summary - pulse summary */
async function pulseSummary(req, res, next) {
  try {
    const { id } = req.params;
    const { roundId, tags } = req.query;

    // load survey to check access
    const survey = await Survey.model
      .findById(id)
      .populate([
        {
          path: 'surveyItems',
          populate: {
            path: 'question',
            select: 'type'
          }
        },
        {
          path: 'pulseSurveyDrivers'
        }
      ])
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // exclude NetPromoterScore survey items
    const exclude = survey.surveyItems
      .filter(item => item.question.type === 'netPromoterScore')
      .map(i => i._id);

    // load rounds
    const rounds = await PulseSurveyRound.model
      .find({ survey: survey._id })
      .sort('-createdAt')
      .lean();

    // init accumulator
    const acc = {};
    const sumAcc = {
      sum: 0,
      n: 0,
      hygieneSum: 0,
      hygieneN: 0,
      motivatingSum: 0,
      motivatingN: 0
    };

    rounds.forEach((round) => {
      acc[round._id] = {
        ...round,
        sum: 0,
        n: 0,
        hygieneSum: 0,
        hygieneN: 0,
        motivatingSum: 0,
        motivatingN: 0
      };
    });

    const query = { pulseSurveyRound: { $in: rounds.map(r => r._id) } };

    if (exclude.length) query.surveyItem = { $nin: exclude };

    const hygieneIds = [];
    const motivatingIds = [];

    survey.pulseSurveyDrivers.forEach((round) => {
      if (round.factor === 'hygiene') hygieneIds.push(round._id.toString());
      if (round.factor === 'motivating') motivatingIds.push(round._id.toString());
    });

    if (roundId) query.pulseSurveyRound = roundId;
    if (tags) {
      if (_.isArray(tags)) query.tags = { $all: tags };
      if (_.isString(tags)) query.tags = tags;
    }

    const cursor = await QuestionStatistic.model
      .find(query)
      .select('data pulseSurveyRound pulseSurveyDriver')
      .lean()
      .cursor();

    for (let result = await cursor.next(); result != null; result = await cursor.next()) {
      const { pulseSurveyRound, pulseSurveyDriver, data = {} } = result;

      // sum data
      Object.keys(data).forEach((key) => {
        const value = result.data[key];
        const sum = parseInt(key, 10) * value;

        sumAcc.n += value;
        sumAcc.sum += sum;

        acc[pulseSurveyRound].n += value;
        acc[pulseSurveyRound].sum += sum;

        if (hygieneIds.includes(pulseSurveyDriver.toString())) {
          sumAcc.hygieneSum += sum;
          sumAcc.hygieneN += value;

          acc[pulseSurveyRound].hygieneSum += sum;
          acc[pulseSurveyRound].hygieneN += value;
        }

        if (motivatingIds.includes(pulseSurveyDriver.toString())) {
          sumAcc.motivatingSum += sum;
          sumAcc.motivatingN += value;

          acc[pulseSurveyRound].motivatingSum += sum;
          acc[pulseSurveyRound].motivatingN += value;
        }
      });
    }

    // get survey stats
    const surveyStats = await getSurveyStats({ survey: id, roundId, tags });

    // get survey stats by round
    await async.eachLimit(rounds, 5, (round, cb) => {
      getSurveyStats({ survey: id, roundId: round._id, tags })
        .then((result) => {
          round.stats = result;

          cb();
        })
        .catch(cb);
    });

    // calculate average values
    rounds.forEach((round) => {
      round.avgValue = (acc[round._id].sum / acc[round._id].n || 0)
        .toPrecision(3);
      round.hygieneAverage = (acc[round._id].hygieneSum / acc[round._id].hygieneN || 0)
        .toPrecision(3);
      round.motivatingAverage = (acc[round._id].motivatingSum / acc[round._id].motivatingN || 0)
        .toPrecision(3);
    });

    const factors = {
      hygieneAverage: (sumAcc.hygieneSum / sumAcc.hygieneN || 0).toPrecision(3),
      motivatingAverage: (sumAcc.motivatingSum / sumAcc.motivatingN || 0).toPrecision(3)
    };

    const average = (sumAcc.sum / sumAcc.n || 0).toPrecision(3);

    return res.send({
      average,
      factors,
      surveyStats,
      roundsData: rounds
    });
  } catch (e) {
    return next(e);
  }
}

/** GET /api/v1/advanced-analyze/surveys/:id/pulse-drivers - return list of survey pulse drivers */
async function getPulseSurveyDrivers(req, res, next) {
  try {
    const { id } = req.params;

    // load survey to check access
    const survey = await Survey.model
      .findById(id)
      .populate('pulseSurveyDrivers')
      .lean();

    if (!survey) return res.status(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    return res.send(survey.pulseSurveyDrivers);
  } catch (e) {
    return next(e);
  }
}

// return statistic handler
function statisticHandler(acc, filters = {}) {
  return async (item, cb) => {
    const query = { ...filters, surveyItem: item._id };

    await recursionWrapper({ query, item, acc });

    cb();
  };
}

// recursion for loading question statistic
async function recursionWrapper({ skip = 0, limit = 1000, query, item, acc }) {
  try {
    // load batch of statistic data
    const results = await QuestionStatistic.model
      .find(query)
      .select('data')
      .skip(skip)
      .limit(limit)
      .lean();

    // handle data and iterate accumulator values
    if (results && results.length) {
      results.forEach((result) => {
        Object.keys(result.data || {}).forEach((key) => {
          const value = result.data[key];
          const sum = parseInt(key, 10) * value;

          acc.n += value;
          acc.sum += sum;
          acc[item.surveySection].n += value;
          acc[item.surveySection].sum += sum;
          acc[item.surveySection][item._id].n += value;
          acc[item.surveySection][item._id].sum += sum;
        });
      });

      skip += 1000;

      // load and handle next batch
      await recursionWrapper({ skip, item, query, acc });
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

export default {
  replies,
  locations,
  devices,
  npsStatistic,
  npsComments,
  dependency,
  insights,
  driverReport,
  pulseSummary,
  getPulseSurveyDrivers
};
