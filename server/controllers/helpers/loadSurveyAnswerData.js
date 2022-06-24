import httpStatus from 'http-status';
import _ from 'lodash';

// models
import {
  SurveyResult,
  Invite,
  TeamUser,
  Survey,
  SurveySection,
  PulseSurveyRoundResult,
  Target
} from '../../models';

// services
import { APIMessagesExtractor } from '../../services';
import { redisClient } from '../../services/RedisClientBuilder';

// helpers
import { surveyAccess } from './index';
import applyDraftData from '../../helpers/applyDraftData';
import { loadPreviewSurveySections } from './draftLoaders';

// config
import config from '../../../config/env';

const _errorWrapper = (status, body) => ({ error: { status, body } });

/**
 * Load survey answer data or return validation error
 * @param  {object} options
 * @param  {string} options.token
 * @param  {string} options.fingerprintId
 * @param  {string} options.surveyId
 * @param  {array} options.assets
 * @param  {user} user
 * @param  {boolean} create
 * @return {object} { surveyResult, invite }
 */
export default async function loadSurveyAnswerData(req, create = false) {
  try {
    const { token, fingerprintId, surveyId, assets = [], targetId } = { ...req.body, ...req.query };
    const { timeZone = config.timezone, lang } = req.cookies;
    const { user } = req;

    if (token && fingerprintId) return _errorWrapper(httpStatus.BAD_REQUEST);

    let invite;
    let pulseSurveyRoundResult;
    let target;

    if (token) {
      invite = await Invite.model.findOne({ token });

      if (!invite) {
        pulseSurveyRoundResult = await PulseSurveyRoundResult.model
          .findOne({ token })
          .lean();

        if (!pulseSurveyRoundResult) return _errorWrapper(httpStatus.NOT_FOUND);
      }

      if (invite) {
        const error = await _checkScope({ invite, user });

        if (error) return error;

        // check if invite is expired
        if (invite.isExpired) {
          const message = await APIMessagesExtractor.getMessage(lang, 'invite.isExpired');

          return _errorWrapper(httpStatus.OK, { message, isExpired: true });
        }
      }
    }

    if (targetId) {
      // find target by token
      target = await Target.model
        .findOne({
          _id: targetId,
          survey: surveyId
        })
        .lean();

      if (!target) return _errorWrapper(httpStatus.NOT_FOUND);
    }

    // build surveyResult query
    const query = { survey: _.get(invite || pulseSurveyRoundResult, 'survey', surveyId) };
    if (token) query.token = token;
    if (fingerprintId) query.fingerprintId = fingerprintId;
    if (assets.length) query.assets = { $eq: assets };
    if (_.get(invite, 'target')) query.target = _.get(invite, 'target');
    if (target) query.target = target._id;

    const surveyResult = await SurveyResult.model
      .findOne(query)
      .populate({
        path: 'company',
        select: 'logo'
      })
      .sort({ startedAt: -1 });

    if (!create && !surveyResult) return _errorWrapper(httpStatus.NOT_FOUND);

    const preview = _.get(surveyResult, 'preview', _.get(invite, 'preview', false));

    // TODO rewrite query for survey
    // load survey
    const survey = await _loadSurvey({ _id: _.get(invite || pulseSurveyRoundResult || target, 'survey', surveyId) }, preview, pulseSurveyRoundResult || invite);

    if (!survey) return _errorWrapper(httpStatus.NOT_FOUND);

    // check survey duration time
    const noAccess = await surveyAccess({
      timeZone,
      lang: lang || survey.defaultLanguage,
      startDate: survey.startDate,
      endDate: survey.endDate
    });

    // skip start end date validation on preview
    if (noAccess && !preview) return _errorWrapper(httpStatus.OK, { message: noAccess });

    return { survey, surveyResult, invite, target, pulseSurveyRoundResult };
  } catch (e) {
    return Promise.reject(e);
  }
}

async function _checkScope({ invite, user }) {
  try {
    const { preview, type, company, team } = invite;

    if (!preview || (preview && type === 'global')) return;

    if (!user) return _errorWrapper(httpStatus.UNAUTHORIZED);

    const { _id: userId, companyId, isAdmin, isPowerUser } = user;

    if (companyId.toString() !== company.toString()) return _errorWrapper(httpStatus.FORBIDDEN);

    // check if user isn't admin or power user
    if (type === 'team' && (!isAdmin && !isPowerUser)) {
      const userTeam = await TeamUser.model
        .findOne({
          user: userId,
          company,
          team
        })
        .lean();

      // forbid if team user is not present
      if (!userTeam) return _errorWrapper(httpStatus.FORBIDDEN);
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

// load survey data for answer handling
async function _loadSurvey(query, isPreview, pulseSurveyRoundResult) {
  try {
    // load survey separately without .lean() to call methods
    const survey = await Survey.model
      .findOne(query)
      .populate('surveyTheme');

    if (!survey) return;

    // load survey sections and merge draft data for preview
    if (isPreview) {
      applyDraftData(survey);

      // apply draft on survey theme
      if (survey.surveyTheme) applyDraftData(survey.surveyTheme);

      survey.surveySections = await loadPreviewSurveySections(survey._id, survey.surveyType === 'pulse', pulseSurveyRoundResult);

      return survey;
    }

    const cachedSurvey = await getCachedSurvey(survey);

    const surveyDoc = Object.assign(survey, cachedSurvey || {});

    let { surveySections = [] } = surveyDoc;

    // match survey items by pulseSurveyRoundResult surveyItemsMap if presented
    if (pulseSurveyRoundResult) {
      const { surveyItemsMap = {} } = pulseSurveyRoundResult;

      const surveyItemsIds = Object.keys(surveyItemsMap);

      if (surveyItemsIds.length) {
        surveySections = surveySections.map(section => ({
          ...section,
          surveyItems: section.surveyItems
            .filter(item => surveyItemsIds.includes(item._id.toString()))
        }));
      }
    }

    // init step
    let step = 0;

    // filter empty sections
    if (survey.surveyType === 'pulse') {
      surveySections = surveySections
        .filter(s => (s.surveyItems && s.surveyItems.length) && s.pulseSurveyDriver.active);
    }

    // set survey item index
    surveyDoc.surveySections = surveySections
      .map((s) => {
        s.step = step;

        step += 1;

        s.surveyItems = s.surveyItems.map((item, index) => {
          item.step = index;

          // randomize question items
          if (_.get(item, 'question.randomize')) {
            const questionItems = _.get(item, 'question.questionItems', []);

            _.set(item, 'question.questionItems', _.shuffle(questionItems));
          }

          return item;
        });

        return s;
      });

    return surveyDoc;
  } catch (e) {
    return Promise.reject(e);
  }
}

export async function getCachedSurvey(survey, refresh) {
  try {
    const ttl = 432000; // 5 days in seconds
    const key = `surveyCache#${survey._id}`;

    // load survey
    const cachedSurvey = await redisClient.getAsync(key);

    if (cachedSurvey && config.env !== 'test' && !refresh) {
      // update lifetime
      await redisClient.expireAsync(key, ttl);

      // parse and return survey
      return JSON.parse(cachedSurvey);
    }

    // load all sections
    survey.surveySections = await SurveySection.model
      .find({
        survey: survey._id,
        hide: { $ne: true },
        inDraft: { $ne: true }
      })
      .sort('sortableId')
      .populate([
        {
          path: 'surveyItems',
          match: {
            hide: { $ne: true },
            inTrash: { $ne: true },
            inDraft: { $ne: true }
          },
          populate: [
            {
              path: 'question',
              populate: [
                {
                  path: 'questionItems',
                  match: {
                    inTrash: { $ne: true },
                    inDraft: { $ne: true }
                  },
                },
                {
                  path: 'gridRows',
                  match: {
                    inTrash: { $ne: true },
                    inDraft: { $ne: true }
                  },
                },
                {
                  path: 'gridColumns',
                  match: {
                    inTrash: { $ne: true },
                    inDraft: { $ne: true }
                  },
                }
              ]
            },
            {
              path: 'flowLogic',
              match: { inDraft: { $ne: true } },
              populate: [
                {
                  path: 'flowItems',
                  match: { inDraft: { $ne: true } },
                }
              ]
            },
            {
              path: 'displayLogic',
              match: { inDraft: { $ne: true } },
              populate: [
                {
                  path: 'flowItems',
                  match: { inDraft: { $ne: true } }
                }
              ]
            },
            {
              path: 'contents',
              match: {
                hide: { $ne: true },
                inTrash: { $ne: true },
                inDraft: { $ne: true }
              }
            }
          ]
        },
        {
          path: 'pulseSurveyDriver',
          select: 'active'
        }
      ])
      .lean();

    // save survey to redis
    await redisClient.setexAsync(key, ttl, JSON.stringify(survey));

    return survey;
  } catch (e) {
    return Promise.reject(e);
  }
}
