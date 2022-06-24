import httpStatus from 'http-status';
import moment from 'moment';
import _ from 'lodash';
import async from 'async';

// models
import {
  SurveyItem,
  GridColumn,
  GridRow,
  Question,
  QuestionItem,
  Survey,
  SurveyResult
} from '../../../models';

// helpers
import { initSession } from '../../../helpers/transactions';
import {
  handleScopes,
  checkPermission,
  hasAccess
} from '../../helpers';

import translate from '../../../helpers/translate';

// translation
import APIMessagesExtractor from '../../../services/APIMessagesExtractor';

async function create(req, res, next) {
  const session = await initSession();
  try {
    const { lang } = req.cookies;
    const { team, company } = req.scopes;
    const {
      type, input, name, description, trend, general, questionItems,
      translation, translationLockName, translationLockDescription, defaultCode,
      linearScale, gridRows, gridColumns, configuration, placeholder, quiz, isGlobal,
      textComment, detractorsComment, passivesComment, promotersComment, detractorsPlaceholder,
      passivesPlaceholder, promotersPlaceholder, hideIcons, quizCorrectValue,
      translationLockLinearScaleFromCaption, translationLockLinearScaleToCaption,
      quizCorrectText, quizIncorrectText, quizCorrectTextTranslationLock,
      quizIncorrectTextTranslationLock, quizCondition, quizCorrectRange, dateParams
    } = req.body;

    const question = new Question.model({
      translation,
      team,
      company,
      dateParams,
      type,
      input,
      name,
      description,
      trend,
      general,
      translationLockName,
      translationLockDescription,
      defaultCode,
      linearScale,
      configuration,
      placeholder,
      quiz,
      textComment,
      detractorsComment,
      passivesComment,
      promotersComment,
      detractorsPlaceholder,
      passivesPlaceholder,
      promotersPlaceholder,
      hideIcons,
      quizCorrectValue,
      translationLockLinearScaleFromCaption,
      translationLockLinearScaleToCaption,
      quizCorrectText,
      quizIncorrectText,
      quizCorrectTextTranslationLock,
      quizIncorrectTextTranslationLock,
      quizCondition,
      quizCorrectRange
    });

    handleScopes({ reqScopes: req.scopes, doc: question });

    question._grid = { gridRows, gridColumns };
    question._lang = lang;
    question._questionItems = questionItems;
    question._currentTranslation = translation;
    question._skipHandleDraftTranslation = true;
    question._req_user = req.user._id;

    if (req.user.isTemplateMaker) question.isGlobal = !!isGlobal;

    await session.withTransaction(async () => await question.save({ session }));

    const doc = await _loadDoc({ _id: question._id });

    return res.status(httpStatus.CREATED).send(doc);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

async function update(req, res, next) {
  const session = await initSession();

  try {
    const { id } = req.params;
    const { lang } = req.cookies;
    const {
      type, name, description, general, questionItems, linearScale, defaultCode,
      translation, translationLockName, translationLockDescription, gridRows, gridColumns,
      configuration, placeholder, quiz, isGlobal, textComment, detractorsComment, passivesComment,
      promotersComment, detractorsPlaceholder, passivesPlaceholder, promotersPlaceholder,
      translationLockDetractorsComment, translationLockDetractorsPlaceholder,
      translationLockPassivesComment, translationLockPassivesPlaceholder,
      translationLockPromotersComment, translationLockPromotersPlaceholder,
      translationLockLinearScaleFromCaption, translationLockLinearScaleToCaption, hideIcons,
      quizCorrectValue, quizCorrectText, quizIncorrectText, quizCorrectTextTranslationLock,
      quizIncorrectTextTranslationLock, quizCondition, quizCorrectRange, dateParams
    } = req.body;
    const query = { _id: id };

    const question = await Question.model.findOne(query);

    if (!question) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(question, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // check permission to update
    if (!checkPermission({ user: req.user, doc: question })) {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }

    _.merge(question, {
      type,
      name,
      configuration,
      description,
      general,
      dateParams,
      linearScale, // TODO tests
      defaultCode,
      translation,
      translationLockName,
      translationLockDescription,
      placeholder,
      quiz,
      hideIcons,
      textComment,
      detractorsComment,
      passivesComment,
      promotersComment,
      detractorsPlaceholder,
      passivesPlaceholder,
      promotersPlaceholder,
      translationLockDetractorsComment,
      translationLockDetractorsPlaceholder,
      translationLockPassivesComment,
      translationLockPassivesPlaceholder,
      translationLockPromotersComment,
      translationLockPromotersPlaceholder,
      translationLockLinearScaleFromCaption,
      translationLockLinearScaleToCaption,
      quizCorrectValue,
      quizCorrectText,
      quizIncorrectText,
      quizCorrectTextTranslationLock,
      quizIncorrectTextTranslationLock,
      quizCondition,
      quizCorrectRange
    });

    question._grid = { gridRows, gridColumns };
    question._lang = lang;
    question._questionItems = questionItems;
    question._currentTranslation = translation;
    question._req_user = req.user._id;

    if (req.user.isTemplateMaker) question.isGlobal = isGlobal;

    await session.withTransaction(async () => await question.save({ session }));

    const doc = await _loadDoc({ _id: question._id });

    return res.status(httpStatus.CREATED).send(doc);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

async function translateQuestion(req, res, next) {
  try {
    const { id } = req.params;
    const { from, to } = req.body;
    const query = { _id: id };

    const question = await _loadDoc(query);

    if (!question) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(question, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // translation question fields
    const fields = [
      'name',
      'description',
      'placeholder',
      'detractorsComment',
      'detractorsPlaceholder',
      'passivesComment',
      'passivesPlaceholder',
      'promotersComment',
      'promotersPlaceholder'
    ];
    for (const field of fields) {
      if (question[field]) {
        // TODO research for another translations APIs
        // TODO refactor to move to one method
        question[field][to] = await translate(
          question[field][from],
          {
            from,
            to,
            engine: 'google',
            key: process.env.GOOGLE_API_KEY
          }
        );
      }
    }

    // set translation flag
    question.translation[to] = true;

    // translate question items
    if (['multipleChoice', 'checkboxes', 'dropdown', 'imageChoice'].includes(question.type)) {
      for (const item of question.questionItems) {
        // TODO research for another translations APIs
        // TODO refactor to move to one method
        item.name[to] = await translate(
          item.name[from],
          {
            from,
            to,
            engine: 'google',
            key: process.env.GOOGLE_API_KEY
          }
        );
      }
    }

    if (['multipleChoiceMatrix', 'checkboxMatrix'].includes(question.type)) {
      for (const item of question.gridRows) {
        // TODO research for another translations APIs
        // TODO refactor to move to one method
        item.name[to] = await translate(
          item.name[from],
          {
            from,
            to,
            engine: 'google',
            key: process.env.GOOGLE_API_KEY
          }
        );
      }

      for (const item of question.gridColumns) {
        // TODO research for another translations APIs
        // TODO refactor to move to one method
        item.name[to] = await translate(
          item.name[from],
          {
            from,
            to,
            engine: 'google',
            key: process.env.GOOGLE_API_KEY
          }
        );
      }
    }

    if (
      ['linearScale', 'netPromoterScore', 'slider', 'thumbs'].includes(question.type) &&
      question.linearScale &&
      question.linearScale.fromCaption &&
      question.linearScale.toCaption
    ) {
      question.linearScale.fromCaption[to] = await translate(
        question.linearScale.fromCaption[from],
        {
          from,
          to,
          engine: 'google',
          key: process.env.GOOGLE_API_KEY
        }
      );
      question.linearScale.toCaption[to] = await translate(
        question.linearScale.toCaption[from],
        {
          from,
          to,
          engine: 'google',
          key: process.env.GOOGLE_API_KEY
        }
      );
    }

    return res.send(question);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

async function removeTranslation(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;
    const { lang } = req.body;
    const query = { _id: id };

    let doc = await _loadDoc(query);

    if (!doc) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(doc, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // number of current languages
    const langs = Object.keys(doc.translation)
      .filter(key => doc.translation[key])
      .length;

    // if languages is last return error
    if (langs === 1) return res.send({ message: await APIMessagesExtractor.getMessage('en', 'survey.lastLang') });

    // find related entities
    const [
      question,
      questionItems,
      gridRows,
      gridColumns
    ] = await Promise.all([
      Question.model.findOne(query),
      QuestionItem.model.find({ question: doc._id }),
      GridRow.model.find({ question: doc._id }),
      GridColumn.model.find({ question: doc._id }),
    ]);

    // unset question localize fields
    question.translation[lang] = false;
    question.translationLockName[lang] = false;
    question.translationLockDescription[lang] = false;
    question.name[lang] = undefined;
    question.placeholder[lang] = undefined;
    question.description[lang] = undefined;

    // update Question, QuestionItems, GridRows and GridColumns
    await session.withTransaction(async () => {
      await question.save({ session });
      await async.eachLimit([...questionItems, ...gridRows, ...gridColumns], 5, (i, cb) => {
        i.translationLock[lang] = false;
        i.name[lang] = undefined;
        i.save({ session })
          .then(() => cb())
          .catch(cb);
      });
    });

    doc = await _loadDoc({ _id: question._id });

    return res.send(doc);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// GET /api/v1/questions/:id/report - return report by question
// async function report(req, res, next) {
//   try {
//     const { id } = req.params;
//     const { from, to, surveys = [] } = req.query;
//
//     const question = await _loadDoc({ _id: id });
//
//     if (!question) return res.sendStatus(httpStatus.NOT_FOUND);
//
//     if (!hasAccess(question, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);
//
//     // filter survey items by given surveys
//     let surveyItems;
//
//     // find survey items by given surveys for filter
//     if (surveys && surveys.length) {
//       surveyItems = await SurveyItem.model
//         .find({
//           survey: { $in: surveys },
//           question: question._id,
//           type: 'trendQuestion',
//           inDraft: { $ne: true },
//           inTrash: { $ne: true }
//         })
//         .select('_id')
//         .lean();
//
//       if (!surveyItems.length) return res.sendStatus(httpStatus.NOT_FOUND);
//
//       surveyItems = surveyItems.map(i => i._id);
//     }
//
//     const report = await summaryQuestionReport({
//       question,
//       surveyItems,
//       range: { from, to },
//       customAnswer: [ // count custom answers
//         'checkboxes',
//         'multipleChoice'
//       ].includes(question.type)
//     });
//
//     return res.send(report);
//   } catch (e) {
//     return next(e);
//   }
// }

// GET /api/v1/questions/:id/surveys - return surveys by question
async function questionSurveys(req, res, next) {
  try {
    const { id } = req.params;

    const question = await Question.model
      .findOne({ _id: id })
      .lean();

    if (!question) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(question, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const query = {
      question: question._id,
      type: 'trendQuestion',
      inDraft: { $ne: true },
      inTrash: { $ne: true }
    };

    // git distinct survey item ids by related to trend question survey items
    const surveyIds = await SurveyItem.model
      .find(query)
      .distinct('survey')
      .lean();

    // load surveys
    const surveys = await Survey.model
      .find({
        _id: { $in: surveyIds },
        type: 'survey'
      })
      .select('name questionsCount')
      .lean();

    return res.send(surveys);
  } catch (e) {
    return next(e);
  }
}

// POST /api/v1/questions/:id/clone-from-survey - clone question from survey with General/Trend type
async function questionCloneFromSurvey(req, res, next) {
  const session = await initSession();

  try {
    const { id } = req.params;
    const { type } = req.body;

    const question = await Question.model.findOne({ _id: id });

    if (!question) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(question, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // Set translation's field for Draft version
    _setTranslationFields(question.draftData);

    // Set translation's field for Publish version
    _setTranslationFields(question);

    const {
      defaultLanguage,
      translation
    } = _.merge(question, question.draftData);

    const clonedQuestion = await question.getClone({ session,
      draftClone: true,
      translation: true,
      assign: {
        draftData: { // add translation data to main object
          defaultLanguage,
          translation
        }
      },
      assignItem: {
        draftData: { // add translation data to each item if present
          defaultLanguage,
          translation
        }
      },
      setDraftAsPublish: true
    });

    switch (type) {
      case 'general':
        clonedQuestion.general = true;
        break;

      case 'trend':
        clonedQuestion.trend = true;
        break;

      default:
        return res.sendStatus(httpStatus.BAD_REQUEST);
    }

    const { _id: createdCopyId } = await clonedQuestion.save();

    return res.status(httpStatus.CREATED).send(createdCopyId);
  } catch (e) {
    return next(e);
  }
}

// GET /api/v1/questions/:id/custom-answers - return custom answers by trend question
async function customAnswers(req, res, next) {
  try {
    const { id } = req.params;
    const {
      surveys,
      value,
      from,
      to,
      skip = 0,
      limit = 10,
      sort = 'desc' // for nps comments
    } = req.query;

    const question = await Question.model
      .findOne({ _id: id })
      .lean();

    if (!question) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(question, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const surveyItems = await _loadSurveyItems(question._id, surveys);

    const $match = {
      empty: { $ne: true },
      hide: { $ne: true }
    };

    if (surveyItems && surveyItems.length) {
      $match.$or = surveyItems.map((item) => {
        const condition = {};
        // filter survey results with custom answers
        condition[`answer.${item._id}.customAnswer`] = { $exists: true };

        return condition;
      });
    }

    // apply range
    if (from || to) {
      $match.createdAt = {};

      if (from) $match.createdAt.$gte = moment(from).startOf('day').toDate();
      if (to) $match.createdAt.$lte = moment(to).endOf('day').toDate();
    }

    // get only given survey item answers from responds
    const filter = surveyItems.reduce((acc, item) => {
      if (question.type === 'netPromoterScore') acc[`answer.${item._id}.value`] = 1;

      acc[`answer.${item._id}.customAnswer`] = 1;

      return acc;
    }, {});

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

    // apply value filter if question is net promoter score
    if (question.type === 'netPromoterScore') {
      if (_.isArray(value)) aggregate.push({ $match: { value: { $in: value } } });
      if (_.isNumber(value)) aggregate.push({ $match: { value } });

      aggregate.push({ $sort: { value: { asc: 1, desc: -1 }[sort] } });
    }

    const [
      data,
      total
    ] = await Promise.all([
      SurveyResult.model.aggregate([
        ...aggregate,
        { $skip: skip },
        { $limit: limit }
      ]),
      SurveyResult.model.aggregate([
        ...aggregate,
        {
          $group: {
            _id: 0,
            total: { $sum: 1 }
          }
        }
      ]),
    ]);

    // apply survey items to results
    const resources = data.map((d) => {
      d.surveyItem = surveyItems.find(s => s._id.toString() === d.surveyItem);

      return d;
    });

    return res.send({
      resources,
      total: total.length ? total[0].total : 0
    });
  } catch (e) {
    return next(e);
  }
}

/** DELETE /api/v1/questions/:id */
async function destroy(req, res, next) {
  const session = await initSession();

  try {
    const { id } = req.params;

    // find question
    const question = await Question.model.findOne({ _id: id });

    // return error if question not found
    if (!question) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(question, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // check permissions to delete
    if (!checkPermission({ user: req.user, doc: question })) {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }

    await session.withTransaction(async () => {
      await question.softDelete({ session, _req_user: { _id: req.user._id } });
    });

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// Mutates the original object
/*
  Set translation's fields if [translation] isn't provided
  {
    defaultLanguage: "en"
    name: {en: "Example text", ru: "Пример текста"}
  } => {
    defaultLanguage: "en"
    name: {en: "Example text", ru: "Пример текста"}
    translation: {en: true, de: false, fr: false, ru: true ...}
  }
*/
function _setTranslationFields(objToSet) {
  if (_.isEmpty(objToSet) || !objToSet.name) return;

  objToSet.translation = {};
  Object.keys(objToSet.name).map(el => typeof objToSet.name[el] === 'string' && (objToSet.translation[el] = true));
}

async function _loadDoc(query) {
  return await Question.model
    .findOne(query)
    .populate([
      {
        path: 'questionItems',
        select: 'createdAt team name translationLock quizCorrect quizResultText quizResultTextTranslationLock sortableId dataType bgImage icon imgCloudinary unsplashUrl',
        options: { sort: { sortableId: 1 } }
      },
      {
        path: 'gridRows',
        select: 'createdAt team name type translationLock',
        options: { sort: { sortableId: 1 } }
      },
      {
        path: 'gridColumns',
        select: 'createdAt team name type translationLock score',
        options: { sort: { sortableId: 1 } }
      },
      {
        path: 'team',
        select: 'name',
      },
      {
        path: 'createdBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      },
      {
        path: 'updatedBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      }
    ])
    .lean();
}

async function _loadSurveyItems(question, surveys) {
  try {
    const query = {
      question,
      type: 'trendQuestion',
      inDraft: { $ne: true },
      inTrash: { $ne: true }
    };

    if (surveys && surveys.length) query.survey = { $in: surveys };

    return await SurveyItem.model.find(query).lean();
  } catch (e) {
    return Promise.reject(e);
  }
}

export default {
  create,
  update,
  destroy,
  questionSurveys,
  questionCloneFromSurvey,
  customAnswers,
  translateQuestion,
  removeTranslation
};
