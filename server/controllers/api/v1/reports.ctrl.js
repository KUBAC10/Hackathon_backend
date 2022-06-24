import _ from 'lodash';
import httpStatus from 'http-status';
import fs from 'fs';
import path from 'path';

// config
import config from '../../../../config/env';

// models
import {
  Question,
  SurveyItem,
  Survey
} from '../../../models';

// services
import reportsBuilder from '../../../services/reportsBuilder/index';

// helpers
import getSurveyStats from '../../helpers/getSurveyStats';
import base64Encode from '../../helpers/base64Encode';
import { hasAccess } from '../../helpers';

// GET /api/v1/reports/survey-stats - Get survey stats data
async function surveyStats(req, res, next) {
  try {
    const { surveyId } = req.query;
    // get survey stats
    const data = await getSurveyStats(surveyId);

    return res.json(data);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// GET /api/v1/reports/survey - Get survey reports data
async function dataBySurvey(req, res, next) {
  try {
    const { timeZone = config.timezone } = req.cookies;
    const { surveyId, range = {}, stats, prevPeriod } = req.query;
    const query = { _id: surveyId };

    // get survey with all related entities
    const survey = await _loadSurveyDoc(query);

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    return res.json(await reportsBuilder.surveyReport({
      range, survey, prevPeriod, timeZone, stats
    }));
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// GET /api/v1/reports/question - Get question reports data
async function dataByQuestion(req, res, next) {
  let surveyItem;
  let question;
  try {
    const { timeZone = config.timezone } = req.cookies;
    const { surveyItemId, questionId, questionItemId, surveys } = req.query;

    // get report by question from survey
    if (surveyItemId) {
      const query = { _id: surveyItemId };

      // make question item match for segments
      const questionItemMatch = { inTrash: { $ne: true } };
      if (questionItemId) questionItemMatch._id = questionItemId;

      // find survey item and get question from it
      surveyItem = await SurveyItem.model
        .findOne(query)
        .populate([
          {
            path: 'question',
            populate: [
              {
                path: 'questionItems',
                select: 'name team createdAt localization',
                match: questionItemMatch
              },
              {
                path: 'gridRows',
                select: 'name team createdAt localization'
              },
              {
                path: 'gridColumns',
                select: 'name team createdAt localization score'
              }
            ]
          }
        ])
        .lean();
      // return  error if survey item or question does not existing
      if (!surveyItem || !surveyItem.question) return res.sendStatus(httpStatus.NOT_FOUND);

      if (!hasAccess(surveyItem, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

      question = surveyItem.question;
    }

    // get report by trend question
    if (questionId && !surveyItemId) {
      const query = { _id: questionId };

      // find question
      question = await Question.model
        .findOne(query)
        .populate([
          {
            path: 'questionItems',
            select: 'name team createdAt localization'
          },
          {
            path: 'gridRows',
            select: 'name team createdAt localization'
          },
          {
            path: 'gridColumns',
            select: 'name team createdAt localization score'
          }
        ])
        .lean();

      // return error if question does not existing
      if (!question) return res.sendStatus(httpStatus.NOT_FOUND);

      if (!hasAccess(question, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);
    }

    // filter survey items by given surveys
    let surveyItems;

    // find survey items by given surveys for filter
    if (surveys && surveys.length) {
      surveyItems = await SurveyItem.model
        .find({
          survey: { $in: surveys },
          question: question._id,
          type: 'trendQuestion',
          inDraft: { $ne: true },
          inTrash: { $ne: true }
        })
        .select('_id')
        .lean();

      if (!surveyItems.length) return res.sendStatus(httpStatus.NOT_FOUND);

      surveyItems = surveyItems.map(i => i._id);
    }

    // return report data
    return res.json(
      await reportsBuilder
        .questionReport({
          timeZone,
          surveyItem,
          surveyItems,
          question,
          customAnswer: [ // count custom answers
            'checkboxes',
            'multipleChoice'
          ].includes(question.type),
          ..._.pick(req.query, ['range', 'prevPeriod', 'text', 'reportId'])
        })
    );
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

async function _loadSurveyDoc(query) {
  return await Survey.model
    .findOne(query)
    .populate([
      {
        path: 'surveySections',
        select: '_id',
        populate: [
          {
            path: 'surveyItems',
            select: '-createdAt -updatedAt -__v',
            match: { type: { $ne: 'html' }, inTrash: { $ne: true } },
            populate: [
              {
                path: 'question',
                select: '-createdAt -updatedAt -__v',
                populate: [
                  {
                    path: 'questionItems',
                    select: '-createdAt -updatedAt -__v'
                  },
                  {
                    path: 'gridRows',
                    select: 'createdAt team name translationLock type',
                  },
                  {
                    path: 'gridColumns',
                    select: 'createdAt team name translationLock type score',
                  },
                ]
              }
            ]
          }
        ]
      }
    ])
    .lean();
}

// GET /api/v1/reports/fonts - Return fonts by language
function fontsByLanguage(req, res, next) {
  try {
    const { lang } = req.query;

    // get public path
    const dir = path.join(process.env.PWD, 'server');

    // get existing fonts
    const normalPath = fs.existsSync(`${dir}/assets/fonts/${lang}/normal.ttf`);
    const boldPath = fs.existsSync(`${dir}/assets/fonts/${lang}/bold.ttf`);

    // if files exist encode to base64
    if (normalPath && boldPath) {
      return res.json({
        fonts: {
          normal: base64Encode(`${dir}/assets/fonts/${lang}/normal.ttf`),
          bold: base64Encode(`${dir}/assets/fonts/${lang}/bold.ttf`)
        },
        message: `Fonts for ${lang} language successfully downloaded`
      });
    }

    return res.json({ message: `No fonts found for ${lang} language` });
  } catch (e) {
    return next(e);
  }
}


export default { surveyStats, dataBySurvey, dataByQuestion, fontsByLanguage };
