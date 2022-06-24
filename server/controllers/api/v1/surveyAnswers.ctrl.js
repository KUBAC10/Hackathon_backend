import httpStatus from 'http-status';
import _ from 'lodash';
import moment from 'moment';

// configurations
import config from '../../../../config/env';

// models
import {
  ContentItem,
  FlowItem,
  Survey,
  SurveyResult,
  PulseSurveyRecipient
} from '../../../models';

// helpers
import {
  applyCompleteContent,
  loadSurveyAnswerData,
  loadSurveyData,
  validateAnswerData,
  processStepBack,
  skipProcess,
  parseNameVariables
} from '../../helpers';
import applyDraftData from '../../../helpers/applyDraftData';

// mongoose helpers
import { initSession } from '../../../helpers/transactions';

// services
import { APIMessagesExtractor, ReportsListener, } from '../../../services';

// mailers
import completedSurveyMailer from '../../../mailers/completedSurvey.mailer';
import questionNotification from '../../../mailers/questionNotification.mailer';
import completePulseSurveyMailer from '../../../mailers/completePulseSurveyMailer.mailer';

/** POST /api/v1/survey-answers
 * - Create survey result or get existing
 * - Private surveys by token
 * - Public surveys by fingerprintId
 * */
async function create(req, res, next) {
  const session = await initSession();
  try {
    const {
      token, fingerprintId, assets = [],
      answer, meta = {}, lang: queryLang
    } = req.body;

    // load surveyResult and invite
    const {
      survey,
      surveyResult,
      invite = {},
      target = {},
      pulseSurveyRoundResult,
      error
    } = await loadSurveyAnswerData(req, true);

    if (error) {
      return res.status(error.status)
        .send(error.body);
    }

    // set correct language
    const lang = queryLang || survey.defaultLanguage;

    // return surveyResult id if exist or check ttl
    if (surveyResult && !surveyResult.preview) {
      if (!survey.publicTTL) {
        return res.send({ _id: surveyResult._id });
      }

      if (moment(surveyResult.startedAt)
        .add(survey.publicTTL, 'ms')
        .format('x') > moment()
        .format('x')) {
        return res.send({ _id: surveyResult._id });
      }
    }

    // crate survey result
    const newSurveyResult = new SurveyResult.model({
      fingerprintId,
      assets,
      token,
      survey,
      startedAt: new Date(),
      company: survey.company,
      team: survey.team,
      completed: _.isEmpty(survey.surveySections),
      target: _.get(invite, 'target', target._id),
      surveyCampaign: _.get(invite, 'surveyCampaign'),
      tags: _.get(invite, 'tags'),
      meta
    });

    if (invite) {
      newSurveyResult.contact = invite.contact;
      newSurveyResult.email = invite.email;
      newSurveyResult.preview = invite.preview;
      newSurveyResult.tags = invite.tags;
      newSurveyResult.meta = {
        ...invite.meta || {},
        ...newSurveyResult.meta || {}
      };
    }

    let recipient;

    if (pulseSurveyRoundResult) {
      newSurveyResult.pulseSurveyRound = pulseSurveyRoundResult.pulseSurveyRound;
      newSurveyResult.recipient = pulseSurveyRoundResult.recipient;

      // lad recipient to update last answer date and apply tags on new surveyResult
      if (newSurveyResult.recipient) {
        recipient = await PulseSurveyRecipient.model
          .findOne({ _id: newSurveyResult.recipient });

        if (recipient) {
          newSurveyResult.tags = recipient.tags;
          recipient.lastAnswerDate = new Date();
        }
      }
    }

    if (answer) {
      // set predefined data
      // validate answer data, return error or current step items and survey
      const { surveySection } = await validateAnswerData({
        lang,
        answer,
        survey,
        surveyResult: newSurveyResult
      });

      // skip validation errors on create
      // if (error) return res.status(error.status).send(error.data);

      // process items
      newSurveyResult._answer = answer;
      newSurveyResult._surveySection = surveySection;

      // trigger "optionSelected" webhook if only one question is answered
      const surveyItemIds = Object.keys(answer);

      if (surveyItemIds.length === 1) {
        const [key] = surveyItemIds;

        newSurveyResult._optionSelectedWH = { [key]: answer[key] };
      }
    }

    // set quiz total questions to result if survey type is "quiz"
    if (survey.surveyType === 'quiz') newSurveyResult.quizTotal = await survey.countQuizQuestions();

    // save survey result
    await session.withTransaction(async () => {
      await newSurveyResult.save({ session });

      if (recipient) await recipient.save({ session });
    });

    return res.send({ _id: newSurveyResult._id });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** PUT /api/v1/survey-answers
 * - Answer process on survey by token or fingerprintId
 * - Add new answers
 * - Render survey according to skip/display logic or not.
 *  */
async function update(req, res, next) {
  const session = await initSession();
  try {
    const { answer, clientIp, lang: queryLang, useragent: agent } = req.body;

    // load surveyResult and invite
    const { survey, surveyResult, error: err } = await loadSurveyAnswerData(req);

    if (err) {
      return res.status(err.status)
        .send(err.body);
    }

    // set correct language
    const lang = queryLang || survey.defaultLanguage;

    // validate answer data, return error or current step items and survey
    const {
      surveySection,
      notifications,
      error
    } = await validateAnswerData({ lang, answer, survey, surveyResult });

    if (error) {
      return res.status(error.status).send(error.data);
    }

    // process items
    surveyResult._answer = answer;
    surveyResult._surveySection = surveySection;

    // check if step changed
    if (_.last(surveyResult.stepHistory) !== surveyResult.step) {
      surveyResult.stepHistory.push(surveyResult.step);
    }

    let quizResult;
    // TODO rewrite
    // process quiz results
    if (survey.surveyType === 'quiz') {
      const processQuizResult = await survey
        .processQuizResult(answer, surveySection.surveyItems.map(_omitSurveyItem));
      // set correct answers or increment
      surveyResult.quizCorrect = (surveyResult.quizCorrect || 0) + processQuizResult.quizCorrect;
      // set quiz results to return to client
      if (survey.showResultText !== 'none') quizResult = processQuizResult.quizResult;
    }

    // set device
    surveyResult._devices = agent;

    // save survey result for answer handling
    await session.withTransaction(async () => await surveyResult.save({ session }));

    // skip questions
    await _handleDisplayLogic(survey, surveyResult.answer);

    if (survey.scoring) {
      surveyResult.scorePoints = survey
        .countScorePoints(surveyResult.answer, survey.surveySections);
    }

    // load survey data by skip logic or next section
    const nextSection = await loadSurveyData(surveyResult, survey);

    // skip answer handle
    surveyResult._answer = undefined;
    surveyResult._surveySection = undefined;

    // set clientIp
    surveyResult._clientIp = clientIp;

    // TODO check if need double save?
    // save survey result with new step
    await session.withTransaction(async () => await surveyResult.save({ session }));

    // process live-data
    ReportsListener.liveData(survey._id, surveySection.surveyItems);

    // if answers with notifications was answered send mailers
    questionNotification({ notifications, lang: survey.defaultLanguage });

    // complete survey
    if (surveyResult.completed && config.env === 'production') {
      if (surveyResult.contact || surveyResult.email) {
        completedSurveyMailer({ survey, surveyResult, lang });
      }
      if (surveyResult.recipient) {
        completePulseSurveyMailer({ surveyResult });
      }
    }

    const response = await _buildResponse({ survey, surveyResult, lang, quizResult, nextSection });

    return res.json(response);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/surveys-answers/step-back
 * - Load surveyResult and check stepBack or preview field
 * - Get prev step from list and set it to result
 * - Load and return survey with appropriate section
 * */
async function stepBack(req, res, next) {
  const session = await initSession();
  try {
    const { lang: queryLang } = req.query;

    // load surveyResult and invite
    const { survey, surveyResult, error } = await loadSurveyAnswerData(req);
    if (error) {
      return res.status(error.status).send(error.body);
    }

    // set correct language
    const lang = queryLang || survey.defaultLanguage;

    // TODO rewrite
    // change stepHistory and step if it possible
    if (survey.allowReAnswer && (surveyResult.stepHistory.length > 0 || surveyResult.questionStepHistory.length > 0) && survey.surveyType === 'survey') {
      const { nextSection, error } = processStepBack({ survey, surveyResult });

      if (error) {
        // return error if step back is forbidden or impossible
        const message = await APIMessagesExtractor.getMessage(lang, 'survey.cantChangeStep');

        return res.status(httpStatus.OK).send({ message });
      }

      // save survey result with new step
      await session.withTransaction(async () => await surveyResult.save({ session }));

      const response = await _buildResponse({ survey, surveyResult, lang, nextSection });

      return res.json(response);
    }

    // return error if step back is forbidden or impossible
    const message = await APIMessagesExtractor.getMessage(lang, 'survey.cantChangeStep');

    return res.status(httpStatus.OK).send({ message });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/surveys-answers/restart-survey
 * - Load surveyResult and if this survey is allowed to re-answer
 * - Set answer step to first
 * - Load and return survey with appropriate section
 * */
async function restartSurveyAnswer(req, res, next) {
  const session = await initSession();
  try {
    const { lang: queryLang } = req.query;

    // load surveyResult and invite
    const { survey, surveyResult, error } = await loadSurveyAnswerData(req);

    if (error) {
      return res.status(error.status)
        .send(error.body);
    }

    // set correct language
    const lang = queryLang || survey.defaultLanguage;

    // TODO rewrite
    // change stepHistory and step if it possible
    if (survey.allowReAnswer && surveyResult.stepHistory.length > 0 && survey.surveyType === 'survey') {
      // handle stepHistory and change step
      surveyResult._reanswer = true;
      surveyResult.step = 0;
      surveyResult.completed = false;
      surveyResult.stepHistory = [];
      surveyResult.questionStepHistory = [];

      // save survey result with new step
      await session.withTransaction(async () => await surveyResult.save({ session }));

      const response = await _buildResponse({ survey, surveyResult, lang });

      return res.json(response);
    }

    // return error if step back is forbidden or impossible
    const message = await APIMessagesExtractor.getMessage(lang, 'survey.cantChangeStep');

    return res.status(httpStatus.OK)
      .send({ message });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/survey-answers
 * Return valid survey structure for answer process by current state of survey result */
async function show(req, res, next) {
  try {
    const { lang: queryLang } = req.query;

    // load surveyResult and invite
    const { survey, surveyResult, error } = await loadSurveyAnswerData(req);

    if (error) {
      return res.status(error.status)
        .send(error.body);
    }

    // set correct language
    const lang = queryLang || survey.defaultLanguage;

    // check survey status
    if (!survey.active && !surveyResult.preview) {
      const message = await APIMessagesExtractor.getMessage(lang, 'survey.notActive');

      return res.send({ message: message || 'Survey is not active now' });
    }

    // skip questions
    await _handleDisplayLogic(survey, surveyResult.answer);

    const response = await _buildResponse({ survey, surveyResult, lang });

    return res.json(response);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// build survey response depends on surveyResult stage and survey type
async function _buildResponse(data) {
  const { survey, surveyResult, lang, quizResult, nextSection } = data;

  const result = {
    quizResult,
    allowReAnswer: survey.allowReAnswer, // TODO remove from top level?
    completed: !!surveyResult.completed,
    survey: {
      _id: survey._id,
      surveyType: survey.surveyType,
      allowReAnswer: survey.allowReAnswer,
      displaySingleQuestion: survey.displaySingleQuestion,
      timer: survey.timer,
      name: _.get(survey, 'name', {}),
      translation: _.get(survey, 'translation'),
      company: { logo: surveyResult.company.logo },
      footer: _.get(survey, 'footer', {}),
      defaultLanguage: _.get(survey, 'defaultLanguage'),
      surveyTheme: _.get(survey, 'surveyTheme', {}),
      references: _.get(survey, 'references', {}),
      showResultText: _.get(survey, 'showResultText'),
      customAnimation: survey.customAnimation,
      scoreCondition: survey.scoreCondition
    }
  };

  // apply end page data if completed
  if (surveyResult.completed) {
    const newEndPage = await _getEndPage(survey, surveyResult);
    await applyCompleteContent({
      lang,
      surveyResult,
      response: result,
      endPage: newEndPage,
      surveyType: survey.surveyType
    });

    result.survey.newEndPage = newEndPage;
    result.completed = true;
  } else {
    // load survey section depends on survey config and return section
    result.survey.surveySection = _omitSection(nextSection
      || survey.surveySections.find(s => s.step === surveyResult.step));

    // TODO update and complete survey result!!!
    // if no valid sections find -> complete survey
    if (!result.survey.surveySection) {
      result.completed = true;

      const newEndPage = await _getEndPage(survey, surveyResult);
      await applyCompleteContent({
        lang,
        surveyResult,
        response: result,
        endPage: newEndPage,
        surveyType: survey.surveyType
      });

      return result;
    }

    // handle display single question if current section is present
    if (survey.displaySingleQuestion && result.survey.surveySection) {
      const surveyItems = result.survey.surveySection.surveyItems;
      let currentSurveyItem;

      if (surveyResult.questionStepHistory.length) {
        const step = _.last(surveyResult.questionStepHistory);
        currentSurveyItem = surveyItems.find(i => i._id.toString() === step);
      }

      if (!currentSurveyItem) [currentSurveyItem] = surveyItems;

      if (currentSurveyItem) {
        result.survey.surveySection.surveyItems = [_omitSurveyItem(currentSurveyItem)];
      }
    }

    // parse name variables
    parseNameVariables({
      survey,
      lang,
      surveyItems: result.survey.surveySection.surveyItems,
      answer: surveyResult.answer
    });
  }

  // get data for status bar if questionNumbers or progressBar enabled on theme
  if (_.get(survey, 'surveyTheme.progressBar') || _.get(survey, 'surveyTheme.questionNumbers')) {
    // find flowLogics in survey
    const surveyItems = _.flatten((survey.surveySections || []).map(i => i.surveyItems));
    const flowLogics = _.flatten((surveyItems || []).map(i => i.flowLogic));

    result.statusBarData = await Survey.model
      .getStatusBarData({ survey, surveyResult, flowLogics });
  }

  // add results data if allowReAnswer and current section is present
  if (survey.allowReAnswer && result.survey.surveySection) {
    result.answer = _.pick(
      surveyResult.answer,
      result.survey.surveySection.surveyItems.map(i => i._id.toString())
    );
  }

  // load start page
  const startPageCond = survey.displaySingleQuestion ?
    _.get(surveyResult, 'questionStepHistory.length', 0) === 0
    : surveyResult.step === 0;
  if (startPageCond) {
    result.survey.startPage = await _getStartPage(survey._id, surveyResult.preview);
  }

  return result;
}

// get endPage by conditions for quiz or get default
async function _getEndPage(surveyDoc, surveyResult) {
  try {
    const { _id: survey, surveyType, scoreCondition = 'correctAmount' } = surveyDoc;
    const { preview, quizCorrect, scorePoints, endPage: flowLogicEndPage } = surveyResult;

    let endPage;

    if (flowLogicEndPage) {
      endPage = await ContentItem.model
        .findOne({ _id: flowLogicEndPage })
        .populate({
          path: 'contentItemElements',
          match: { draftRemove: { $ne: true } }
        })
        .lean();

      if (preview) applyDraftData(endPage);

      return endPage;
    }

    const value = {
      correctAmount: quizCorrect,
      totalScore: scorePoints
    }[scoreCondition];

    if (preview) {
      const flowItems = await FlowItem.model
        .find({
          survey,
          questionType: 'endPage',
          draftRemove: { $ne: true }
        })
        .sort({ sortableId: 1 })
        .lean();

      flowItems.forEach(applyDraftData);

      // find flow item matched by quizCorrect
      const flowItem = flowItems.find(({ condition, count, range }) => {
        switch (condition) {
          case 'equal':
            return count === value;
          case 'less':
            return count > value;
          case 'greater':
            return count < value;
          case 'range':
            return range && range.from && range.to
              && range.from < value
              && range.to > value;

          default:
            return false;
        }
      });

      if (flowItem) {
        endPage = await ContentItem.model
          .findOne({ _id: flowItem.endPage })
          .populate({
            path: 'contentItemElements',
            match: { draftRemove: { $ne: true } }
          })
          .lean();

        applyDraftData(endPage);
      }

      if (!endPage) {
        const endPages = await ContentItem.model
          .find({
            survey,
            type: 'endPage',
            inTrash: { $ne: true },
            draftRemove: { $ne: true }
          })
          .populate({
            path: 'contentItemElements',
            match: { draftRemove: { $ne: true } }
          })
          .lean();

        endPages.forEach(applyDraftData);

        endPage = endPages.find(i => i.default);
      }

      if (endPage && surveyType === 'quiz') endPage.quizCorrect = quizCorrect;

      if (endPage && surveyDoc.scoring) endPage.scorePointsCount = scorePoints;

      if (endPage && endPage.contentItemElements && endPage.contentItemElements.length) {
        endPage.contentItemElements.forEach(applyDraftData);
      }

      return endPage;
    }

    if (surveyType === 'quiz' || surveyDoc.scoring) {
      const flowItem = await FlowItem.model
        .findOne({
          survey,
          questionType: 'endPage',
          inDraft: { $ne: true },
          $or: [
            { condition: 'equal', count: value }, // eq (3) -> eq 3
            { condition: 'less', count: { $gt: value } }, // les 3 -> $gt: 0, 1, 2
            { condition: 'greater', count: { $lt: value } }, // greater 3  -> $lt: 4, 5, 6..
            {
              condition: 'range',
              'range.from': { $lte: value }, // from 2 -> $lt: 3, 4...
              'range.to': { $gte: value } // to 5 -> $gt: 0, 1, 2, 3, 4
            }
          ]
        })
        .populate({
          path: 'endPage',
          match: {
            inDraft: { $ne: true },
            inTrash: { $ne: true }
          },
          populate: {
            path: 'contentItemElements',
            match: { draftRemove: { $ne: true } }
          }
        })
        .sort({ sortableId: 1 })
        .lean();

      if (flowItem && flowItem.endPage) {
        flowItem.endPage.quizCorrect = quizCorrect;
        flowItem.endPage.scorePoints = scorePoints;

        return flowItem.endPage;
      }
    }

    endPage = await ContentItem.model
      .findOne({
        survey,
        default: true,
        type: 'endPage',
        inTrash: { $ne: true },
        inDraft: { $ne: true },
        draftRemove: { $ne: true }
      })
      .populate({
        path: 'contentItemElements',
        match: { draftRemove: { $ne: true } }
      })
      .lean();

    if (endPage && surveyType === 'quiz') endPage.quizCorrect = quizCorrect;

    if (endPage && surveyDoc.scoring) endPage.scorePointsCount = scorePoints;

    return endPage;
  } catch (e) {
    /* istanbul ignore next */
    return Promise.reject(e);
  }
}

async function _getStartPage(surveyId, isPreview) {
  try {
    if (isPreview) {
      const contentItems = await ContentItem.model
        .find({
          survey: surveyId,
          inTrash: { $ne: true },
          draftRemove: { $ne: true },
          type: 'startPage'
        })
        .lean();

      // apply draft data
      contentItems.forEach(applyDraftData);

      const startPage = contentItems.find(item => item.default);

      if (startPage && !startPage.passTimeActive) return _.omit(startPage, 'passTimeLabel');

      return startPage;
    }

    const startPage = await ContentItem.model
      .findOne({
        survey: surveyId,
        inTrash: { $ne: true },
        inDraft: { $ne: true },
        default: true,
        type: 'startPage'
      })
      .lean();

    if (startPage && !startPage.passTimeActive) return _.omit(startPage, 'passTimeLabel');

    return startPage;
  } catch (e) {
    /* istanbul ignore next */
    return Promise.reject(e);
  }
}

// show/display questions depending on answers
async function _handleDisplayLogic(survey, answer = {}) {
  try {
    if (_.isEmpty(answer)) return;

    // get display logic by existed answers
    // const displayLogic = await DisplayLogic.model
    //   .find({ survey: survey._id })
    //   .populate('flowItems')
    //   .lean();

    const displayLogic = [];

    survey.surveySections.forEach(({ surveyItems = [] }) => {
      surveyItems.forEach(item => displayLogic.push(...item.displayLogic || []));
    });

    if (!displayLogic.length) return;

    const hideSurveyItems = [];

    // handle displayLogic.flowItems
    displayLogic.forEach((logic) => {
      const {
        flowItems = [],
        conditionSurveyItem,
        surveyItem,
        method,
        display
      } = logic;

      const result = flowItems[method](item => skipProcess(item, answer[conditionSurveyItem]));

      // if ((result && !display) || (!result && display))

      if (!!result !== !!display) hideSurveyItems.push(surveyItem.toString());
    });

    // remove (hide) survey items
    survey.surveySections.forEach((section) => {
      section.surveyItems = section.surveyItems
        .filter(item => !hideSurveyItems.includes(item._id.toString()));

      if (!section.surveyItems.length) section._hide = true;
    });

    // filter empty sections
    survey.surveySections = survey.surveySections.filter(section => !section._hide);
  } catch (e) {
    return Promise.reject(e);
  }
}

const fields = [
  'inTrash',
  'inDraft',
  'draftRemove',
  'draftData',
  'company',
  'team',
  'notificationMailer',
  'flowLogic'
];

function _omitSection(sectionData) {
  if (!sectionData) return false;
  const { surveyItems = [], ...section } = sectionData;
  return {
    ..._.omit(section, fields),
    surveyItems: surveyItems.map(_omitSurveyItem)
  };
}

function _omitSurveyItem({ question = {}, contents = [], ...surveyItem }) {
  const { questionItems = [], gridRows = [], gridColumns = [], ...questionDoc } = question;

  return {
    ..._.omit(surveyItem, fields),
    contents: contents.map(i => _.omit(i, fields)),
    question: {
      ..._.omit(questionDoc, fields),
      questionItems: questionItems.map(i => _.omit(i, fields)),
      gridColumns: gridColumns.map(i => _.omit(i, fields)),
      gridRows: gridRows.map(i => _.omit(i, fields))
    }
  };
}

export default {
  show,
  create,
  update,
  stepBack,
  restartSurveyAnswer
};
