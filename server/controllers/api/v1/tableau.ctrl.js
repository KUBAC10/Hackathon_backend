import httpStatus from 'http-status';
import uuid from 'uuid';
import _ from 'lodash';

// models
import {
  AccessToken,
  SurveyResult,
  Survey,
  SurveyItem,
  QuestionItem,
  GridRow,
  GridColumn
} from '../../../models';

// helpers
import { hasAccess } from '../../helpers';

// GET /api/v1/tableau/generate-token - generate access token for tableau
async function generateToken(req, res, next) {
  try {
    const { companyId } = req.user;
    const { surveyId } = req.query;

    // check survey id permissions
    const survey = await Survey.model.findOne({ _id: surveyId });
    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);
    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // generate access token
    const token = uuid();

    const accessToken = new AccessToken.model({
      company: companyId,
      token,
      survey
      // expiredAt: TODO check lifetime?
    });

    await accessToken.save();

    return res.send(accessToken);
  } catch (e) {
    return next(e);
  }
}

// GET /api/v1/tableau/survey-by-token/:token - return data for tableau by access token
async function getSurveyDataByToken(req, res, next) {
  try {
    const { token } = req.params;

    const accessToken = await AccessToken.model.findOne({ token })
      .lean();
    if (!accessToken) return res.sendStatus(httpStatus.NOT_FOUND);

    const survey = await Survey.model.findOne({ _id: accessToken.survey })
      .lean();
    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    return res.send({ _id: survey._id, name: survey.name[survey.defaultLanguage] });
  } catch (e) {
    return next(e);
  }
}

// GET /api/v1/tableau/:token - return data for tableau by access token
async function data(req, res, next) {
  try {
    const { token } = req.params;

    // load token
    const accessToken = await AccessToken.model.findOne({ token })
      .lean();
    if (!accessToken) return res.sendStatus(httpStatus.NOT_FOUND);

    // load survey
    const survey = await Survey.model.findOne({ _id: accessToken.survey })
      .lean();
    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    // load questions and items
    const surveyItems = await SurveyItem.model
      .find({
        survey,
        type: { $in: ['question', 'trendQuestion'] }
      })
      .populate({ path: 'question', options: { lean: true } })
      .populate({ path: 'trendQuestion', options: { lean: true } })
      .lean();

    // keep original id of surveyItem
    const questions = surveyItems.map(i => ({ ...i.question, surveyItem: i._id.toString() }));

    const questionItems = await QuestionItem.model
      .find({ question: { $in: questions.map(i => i._id) } })
      .lean();

    const gridRows = await GridRow.model
      .find({ question: { $in: questions.map(i => i._id) } })
      .lean();

    const gridColumns = await GridColumn.model
      .find({ question: { $in: questions.map(i => i._id) } })
      .lean();

    // get result items array
    const items = [...questions, ...questionItems, ...gridRows, ...gridColumns]
      .map(i => ({ ...i, _id: i._id.toString() }));

    const dataRaw = await SurveyResult.model
      .find({
        company: accessToken.company,
        survey: accessToken.survey
      }, '_id createdAt answer meta')
      .lean();

    // normalize answer data JSON
    const data = dataRaw.map(i => ({
      ...i,
      answer: _normalizeAnswer(i.answer, items, survey.defaultLanguage)
    }));

    return res.send({ data });
  } catch (e) {
    return next(e);
  }
}

function _normalizeAnswer(obj = {}, items = [], lang) {
  try {
    const result = {};
    const keys = Object.keys(obj);

    for (const key of keys) {
      // check if key is id and present in items array, then try to replace with translated label
      const itemData = items.find(i => i._id === key || i.surveyItem === key);

      // set name as new key or left id
      let resultKey = key;

      // remove questionItem / crossing keys
      if (resultKey === 'questionItems' || resultKey === 'crossings') resultKey = 'value';

      // assign value to new parsed key
      result[resultKey] = obj[key];

      if (itemData && itemData.name[lang]) result[resultKey].name = itemData.name[lang];

      // recursive parse object
      if (_.isObject(result[resultKey]) && !_.isArray(result[resultKey])) {
        result[resultKey] = _normalizeAnswer(result[resultKey], items, lang);
      }

      // parse array
      if (_.isArray(result[resultKey])) {
        const resultArray = [];
        result[resultKey].forEach((item, index) => {
          // parse string item
          if (_.isString(item)) {
            const stringItemData = items.find(i => i._id === item);
            resultArray[index] = item;
            if (stringItemData) resultArray[index] = stringItemData.name[lang] || item;
          }

          // parse object item
          if (_.isObject(item)) {
            resultArray[index] = _normalizeAnswer(result[resultKey][index], items, lang);
          }
        });

        result[resultKey] = resultArray;
      }

      // parse string
      if (_.isString(result[resultKey])) {
        const stringItemData = items.find(i => i._id === result[resultKey]);
        if (stringItemData) result[resultKey] = stringItemData.name[lang] || result[resultKey];
      }
    }

    // return result object
    return result;
  } catch (e) {
    console.log(e, `_normalizeAnswer err - ${obj._id}`);
    // fallback with original object on error
    return obj;
  }
}

export default {
  generateToken,
  data,
  getSurveyDataByToken
};
