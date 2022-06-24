import keystone from 'keystone';
import moment from 'moment';
import dotObject from 'dot-object';

import { redisClient } from './RedisClientBuilder';
import { liveDataTimeout, liveDataRedisTTL, timezone } from '../../config/env';

// helpers
import { analyzeLoaders } from '../controllers/helpers';
import { loadSurveyReportData } from '../controllers/api/v1/surveyReports.ctrl';
import findContactByName from '../helpers/findContactByName';

// models
import {
  SurveyReport,
  SurveyResult
} from '../models';

class ReportsListener {
  // TODO tests
  liveData = async (surveyId, surveyItems = []) => {
    const delay = await redisClient.getAsync(`${surveyId}#delay`);

    if (delay) return;

    setTimeout(_sendLiveData, liveDataTimeout, { surveyId, surveyItems });

    await redisClient.setAsync(`${surveyId}#delay`, true, 'EX', liveDataRedisTTL);
  }
}

async function _sendLiveData({ surveyId, surveyItems }) {
  try {
    await Promise.all([
      _handleAnalyzeLiveData(surveyId, surveyItems),
      _handleSurveyReportsData(surveyId),
      _handleSurveyResultsData(surveyId)
    ]);
  } catch (e) {
    console.error(`ERROR _handleSurveyReportsData(): ${e}`);
  }
}

async function _handleSurveyReportsData(surveyId,) {
  try {
    // get listened survey reports by survey id from redis
    const surveyReportIds = await redisClient.smembersAsync(`surveyReports#${surveyId}`);

    if (surveyReportIds && surveyReportIds.length) {
      for (const surveyReportId of surveyReportIds) {
        await _applySurveyReportHandler(surveyId)(surveyReportId);
      }
    }
  } catch (e) {
    console.error(`ERROR _handleSurveyReportsData(): ${e}`);
  }
}

function _applySurveyReportHandler(surveyId) {
  return async (surveyReportId) => {
    try {
      const clientSet = await _getClientsSet(`surveyReports#${surveyId}#${surveyReportId}`);

      if (clientSet && clientSet.size) {
        // load survey report data and end to all clients in room
        const surveyReport = await SurveyReport.model
          .findOne({ _id: surveyReportId });

        const result = await loadSurveyReportData({ survey: surveyReport.survey, surveyReport });

        const {
          surveyStats,
          reports,
          segmentResults,
          reportItems,
          segmentItems
        } = result || {};

        keystone.io.of('/')
          .in(`surveyReports#${surveyId}#${surveyReportId}`)
          .emit(`surveyReports#${surveyId}#${surveyReportId}`, {
            surveyStats,
            reports,
            segmentResults,
            surveyReportItems: reportItems,
            segmentsItems: segmentItems,
          });
      }
    } catch (e) {
      console.error(`ERROR _applySurveyReportHandler(): ${e}`);
    }
  };
}

async function _handleAnalyzeLiveData(surveyId, surveyItems) {
  try {
    const hasNpsQuestions = surveyItems
      .some(i => i.question && i.question.type === 'netPromoterScore');

    const clientsSet = await _getClientsSet(`analyze#${surveyId}`);

    if (clientsSet && clientsSet.size) {
      for (const socketId of clientsSet) {
        await _applyAnalyzeSocketHandler(surveyId, hasNpsQuestions)(socketId);
      }
    }
  } catch (e) {
    console.error(`ERROR _handleAnalyzeLiveData(): ${e}`);
  }
}

function _applyAnalyzeSocketHandler(surveyId, hasNpsQuestions) {
  // load and send data to analyze socket
  return async (socketId) => {
    try {
      const timeZone = await redisClient
        .getAsync(`${socketId}#timeZone`);

      // analyze chart type keys
      await Promise.all([
        _sendAnalyzeData('replies', socketId, timeZone, surveyId),
        _sendAnalyzeData('locations', socketId, timeZone, surveyId),
        _sendAnalyzeData('devices', socketId, timeZone, surveyId)
      ]);

      if (hasNpsQuestions) {
        await Promise.all([
          _sendAnalyzeData('npsStatistic', socketId, timeZone, surveyId),
          _sendAnalyzeData('npsComments', socketId, timeZone, surveyId)
        ]);
      }
    } catch (e) {
      console.error(`ERROR _applyAnalyzeSocketHandler(): ${e}`);
    }
  };
}

async function _sendAnalyzeData(key, socketId, timeZone = timezone, surveyId) {
  try {
    // load query from redis
    const query = await redisClient
      .hgetallAsync(`${socketId}#${key}Query`);

    // TODO set default queries
    if (query) {
      query.timeZone = timeZone;
      query.surveyId = surveyId;

      if (query.rangeType === 'all') {
        query.from = undefined;
        query.to = undefined;
      }

      const data = await analyzeLoaders[key](query);

      keystone.io
        .to(socketId)
        .emit(`${key}#data`, data);
    }
  } catch (e) {
    console.error(`ERROR _sendAnalyzeData(): ${e}`);
  }
}

async function _handleSurveyResultsData(surveyId) {
  try {
    const clientsSet = await _getClientsSet(`surveyResults#${surveyId}`);

    if (clientsSet && clientsSet.size) {
      for (const socketId of clientsSet) {
        await _applySurveyResultsHandler(surveyId)(socketId);
      }
    }
  } catch (e) {
    console.error(`ERROR _handleSurveyResultsData(): ${e}`);
  }
}

function _applySurveyResultsHandler(surveyId) {
  return async (socketId) => {
    try {
      // load query from redis
      const queryParams = await redisClient
        .hgetallAsync(`${socketId}#surveyResults`);

      const {
        timeZone = timezone,
        skip = 0,
        limit = 10,
        search,
        completed,
        from,
        to,
        sort = { createdAt: -1 },
        company,
        team
      } = dotObject.object(queryParams || {});

      const query = {
        survey: surveyId,
        empty: false,
        hide: { $ne: true },
        preview: { $ne: true }
      };

      if (from) {
        query.createdAt = {
          $gte: moment(from)
            .startOf('day')
            .tz(timeZone)
        };
      }

      if (to) {
        query.createdAt = {
          ...query.createdAt,
          $lte: moment(to)
            .endOf('day')
            .tz(timeZone)
        };
      }

      if (typeof completed !== 'undefined') query.completed = completed;

      if (search) { // search by location or contact name
        query.$or = [
          { 'location.formattedAddress': { $regex: search, $options: 'i' } },
          { contact: await findContactByName(search, { company, team }) }
        ];
      }

      // load survey results and send to socket
      const [
        resources,
        total
      ] = await Promise.all([
        SurveyResult.model
          .find(query)
          .populate({
            path: 'contact',
            select: 'name',
          })
          .skip(parseInt(skip, 10))
          .limit(parseInt(limit, 10))
          .sort(sort)
          .lean(),
        SurveyResult.model
          .find(query)
          .countDocuments()
      ]);

      keystone.io
        .to(socketId)
        .emit(`surveyResults#${surveyId}`, { resources, total });
    } catch (e) {
      console.error(`ERROR _applySurveyResultsHandler(): ${e}`);
    }
  };
}

// return Set of sockets in room
async function _getClientsSet(room) {
  try {
    return await keystone.io
      .of('/').adapter
      .sockets(new Set([room]));
  } catch (e) {
    console.error(`ERROR _getClientsSet(): ${e}`);
  }
}

const reportsListener = new ReportsListener();

export default reportsListener;
