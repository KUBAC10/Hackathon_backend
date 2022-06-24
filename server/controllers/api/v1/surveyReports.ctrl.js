import httpStatus from 'http-status';
import async from 'async';
import _ from 'lodash';

// models
import {
  SurveyReport,
  SurveyReportItem,
  SurveyItem
} from '../../../models';

// helpers
import {
  handleScopes,
  hasAccess,
  loadSurveyReportSegments,
  analyzeLoaders
} from '../../helpers';
import { initSession } from '../../../helpers/transactions';
import getSurveyStats from '../../helpers/getSurveyStats';
import loadSurveyItemsForReport from '../../helpers/loadSurveyItemsForReport';

// services
import summaryQuestionReport from '../../../services/reportsBuilder/helpers/summaryQuestionReport';
import buildQuery from '../../../services/segments/helpers/buildQuery';

// GET /api/v1/survey-reports - get list of survey reports
async function list(req, res, next) {
  try {
    const { survey, skip, limit, reportsMailing } = req.query;
    const query = { survey, reportsMailing: { $ne: true } };

    handleScopes({ reqScopes: req.scopes, query });

    if (reportsMailing) query.reportsMailing = true;

    const [
      raw,
      total
    ] = await Promise.all([
      SurveyReport.model
        .find(query)
        .populate([
          {
            path: 'survey',
            select: 'questionsCount'
          },
          {
            path: 'surveyReportItems',
            match: { hide: true }
          },
          {
            path: 'surveyCampaign',
            populate: [
              {
                path: 'tags'
              },
              {
                path: 'contacts'
              }
            ]
          }
        ])
        .skip(skip)
        .limit(limit)
        .lean(),
      SurveyReport.model
        .find(query)
        .countDocuments()
    ]);

    const resources = raw.map(({ survey, surveyReportItems = [], ...report }) => ({
      ...report,
      surveyReportItems,
      questions: (survey.questionsCount || 0) - surveyReportItems.length
    }));

    return res.send({ resources, total });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// POST /api/v1/survey-reports - create survey report
async function create(req, res, next) {
  const session = await initSession();
  try {
    const { survey, reportsMailing, emailReportFormat } = req.body;
    const { company, team } = req.scopes;

    const surveyReport = new SurveyReport.model({
      survey, company, team, reportsMailing, emailReportFormat
    });

    await session.withTransaction(async () => await surveyReport.save({ session }));

    const reloadSurveyReport = await SurveyReport.model
      .findOne({ _id: surveyReport._id })
      .populate('surveyReportItems')
      .populate({
        path: 'surveyCampaign',
        populate: [
          {
            path: 'tags'
          },
          {
            path: 'contacts'
          }
        ]
      })
      .lean();

    return res.send(reloadSurveyReport);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// POST /api/v1/survey-reports/:id/clone - clone survey report
async function cloneReport(req, res, next) {
  const session = await initSession();
  try {
    const surveyReport = await SurveyReport.model.findOne({ _id: req.params.id });

    if (!surveyReport) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(surveyReport, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    let cloneId;

    await session.withTransaction(async () => {
      cloneId = await surveyReport.getClone(session);
    });

    const reloadSurveyReport = await SurveyReport.model
      .findById(cloneId)
      .populate('surveyReportItems')
      .lean();

    return res.send(reloadSurveyReport);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// PUT /api/v1/survey-reports/:id - update survey report
async function update(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;
    const { logo, cover, ...data } = req.body;

    const surveyReport = await SurveyReport.model.findById(id);

    if (!surveyReport) return res.send(httpStatus.NOT_FOUND);

    if (!hasAccess(surveyReport, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    Object.assign(surveyReport, data);

    /* istanbul ignore next */
    if (logo || logo === null) surveyReport._logo = logo;
    /* istanbul ignore next */
    if (cover || cover === null) surveyReport._cover = cover;

    await session.withTransaction(async () => await surveyReport.save({ session }));

    const reloadSurveyReport = await SurveyReport.model
      .findById(id)
      .populate({
        path: 'surveyCampaign',
        populate: [
          {
            path: 'tags'
          },
          {
            path: 'contacts'
          }
        ]
      })
      .lean();

    return res.send(reloadSurveyReport);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// POST /api/v1/survey-reports/:surveyReport/survey-item/:surveyItem
async function updateItem(req, res, next) {
  const session = await initSession();
  try {
    const { surveyReport, surveyItem } = req.params;
    const { type = 'surveyReport', params } = req.body;
    const query = { surveyReport, surveyItem, company: req.scopes.company, type };

    let item = await SurveyReportItem.model.findOne(query);

    const report = await SurveyReport.model.findOne({ _id: surveyReport }).lean();

    if (!surveyReport) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(report, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    if (!item) {
      // load report and survey item to check access
      const surveyItemDoc = await SurveyItem.model.findOne({ _id: surveyItem }).lean();

      if (!surveyItemDoc) return res.sendStatus(httpStatus.NOT_FOUND);

      if (!hasAccess(surveyItemDoc, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

      item = new SurveyReportItem.model(query);
    }

    // set data to item
    _.mergeWith(item, req.body, (objValue, srcValue) => {
      if (_.isArray(objValue)) return srcValue;
    });

    if (params) {
      item.params = params;
      item.markModified('params');
    }

    // permit to unhide 30 survey items
    if (!item.hide) {
      const surveyItems = await SurveyItem.model
        .find({ survey: report.survey, inTrash: { $ne: true } })
        .select('_id')
        .lean();

      if (surveyItems.length > 30) {
        const surveyReportItems = await SurveyReportItem.model
          .find({ surveyReport: report._id, hide: true, type })
          .select('surveyItem')
          .lean();

        const surveyReportItemsIds = surveyReportItems.map(i => i.surveyItem.toString());

        const unhidden = surveyItems.filter(i => !surveyReportItemsIds.includes(i._id.toString()));

        if (unhidden.length >= 30) return res.status(httpStatus.BAD_REQUEST).send({ message: 'Permission to unhide 30 questions is exceeded', msgType: 'warning' });
      }
    }

    // create or update surveyReportItem
    await session.withTransaction(async () => await item.save({ session }));

    item = await SurveyReportItem.model
      .findOne({ _id: item._id })
      .lean();

    return res.send(item);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// GET /api/v1/survey-reports/data - get report data
async function data(req, res, next) {
  try {
    const { survey, reportId, surveyItemId } = req.query;

    const surveyReport = await _loadSurveyReportData({ survey, reportId });

    if (!surveyReport) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(surveyReport, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const response = await loadSurveyReportData({ survey, surveyReport, surveyItemId });

    if (!response) return res.sendStatus(httpStatus.BAD_REQUEST);

    const {
      surveyStats,
      reports,
      segmentResults,
      reportItems
    } = response;

    return res.send({
      ...surveyReport.toObject(),
      surveyReportItems: reportItems,
      surveyStats,
      reports,
      segmentResults
    });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// POST /api/v1/survey-reports/:id/get-text-answers-list - get list of text or custom answers
async function getTextAnswersList(req, res, next) {
  const session = await initSession();
  try {
    const { surveyItemId, skip = 0, limit = 25, type = 'report', field = 'value' } = req.body;

    const [
      surveyReport,
      surveyItem
    ] = await Promise.all([
      SurveyReport.model.findOne({ _id: req.params.id }),
      SurveyItem.model.findOne({ _id: surveyItemId })
    ]);

    if (!surveyReport || !surveyItem) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(surveyReport, req.scopes) || !hasAccess(surveyItem, req.scopes)) {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }

    // build query for list of text answers
    const query = buildQuery({
      survey: surveyReport.survey,
      filters: { createdAt: surveyReport.getRange() },
      ...type === 'segments' ? surveyReport.segments || {} : {},
      skipFilter: true // skip apply segments filter on query
    });

    const [
      response
    ] = await Promise.all([
      analyzeLoaders.texAnswers({ query, skip, limit, surveyItem, field }),
      // save skip limit to survey report item
      session.withTransaction(async () => {
        await SurveyReportItem.model.updateOne(
          {
            company: surveyReport.company,
            surveyReport: surveyReport._id,
            surveyItem: surveyItem._id,
            type: type === 'report' ? 'surveyReport' : 'segments'
          },
          { $set: { skip, limit } },
          { upsert: true }
        ).session(session);
      })
    ]);

    return res.send(response);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// DELETE /api/v1/survey-reports/:id - remove survey report
async function destroy(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;

    const surveyReport = await SurveyReport.model
      .findOne({ _id: id, default: { $ne: true } });

    if (!surveyReport) return res.send(httpStatus.NOT_FOUND);

    if (!hasAccess(surveyReport, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    await session.withTransaction(async () => await surveyReport.remove({ session }));

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// load survey report with related entities
async function _loadSurveyReportData(options = {}) {
  try {
    const { survey, reportId } = options;

    let surveyReport;

    // load survey report
    if (survey && reportId) {
      surveyReport = await SurveyReport.model.findOne({ _id: reportId, survey });
    }

    // load default survey report
    if (!surveyReport) {
      surveyReport = await SurveyReport.model.findOne({ survey, default: true });
    }

    if (!surveyReport) return;

    // load report items
    [
      surveyReport.reportItems,
      surveyReport.segmentItems
    ] = await Promise.all([
      SurveyReportItem.model
        .find({ surveyReport: surveyReport._id, type: 'surveyReport' })
        .lean(),
      SurveyReportItem.model
        .find({ surveyReport: surveyReport._id, type: 'segments' })
        .lean()
    ]);

    return surveyReport;
  } catch (e) {
    /* istanbul ignore next */
    return Promise.reject(e);
  }
}

export async function loadSurveyReportData(options = {}) {
  try {
    const { survey, surveyReport, surveyItemId } = options;
    const { reportItems = [], drivers, tags } = surveyReport;
    const range = surveyReport.getRange();

    const surveyItems = await loadSurveyItemsForReport(survey, surveyItemId, drivers);

    if (!surveyItems || !surveyItems.length) return;

    const [
      surveyStats,
      reports,
      segmentResults
    ] = await Promise.all([
      getSurveyStats({ survey, range, tags }),
      loadReports(surveyItems, range, surveyReport, reportItems),
      loadSurveyReportSegments({ survey, surveyItems, surveyReport, reportItems, range })
    ]);

    return {
      surveyStats,
      reports,
      segmentResults,
      reportItems
    };
  } catch (e) {
    return Promise.reject(e);
  }
}

// load reports
export async function loadReports(surveyItems, range, surveyReport, surveyReportItems = []) {
  try {
    const questionSurveyItems = surveyItems.filter(i => ['question', 'trendQuestion'].includes(i.type));

    const result = await async.mapLimit(questionSurveyItems, 5, (surveyItem, cb) => {
      const { question } = surveyItem;

      const surveyReportItem = surveyReportItems
        .find(i => i.surveyItem.toString() === surveyItem._id.toString());

      summaryQuestionReport({ surveyReport, surveyItem, question, range, surveyReportItem })
        .then(result => cb(null, result))
        .catch(cb);
    });

    return result;
  } catch (e) {
    /* istanbul ignore next */
    return Promise.reject(e);
  }
}

export default {
  list,
  create,
  cloneReport,
  update,
  getTextAnswersList,
  destroy,
  data,
  updateItem
};
