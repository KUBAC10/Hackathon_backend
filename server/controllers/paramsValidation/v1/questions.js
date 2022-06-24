// localization
import {
  localizationList,
  localizeValidations,
} from '../../../../config/localization';

import questionReusableTypeError from '../../helpers/questionReusableTypeError';

const questionTypes = [
  'countryList',
  'text',
  'multipleChoice',
  'checkboxes',
  'dropdown',
  'linearScale',
  'thumbs',
  'netPromoterScore',
  'slider',
  'multipleChoiceMatrix',
  'checkboxMatrix',
  'imageChoice'
];

const iconTypes = [
  'ordinary',
  'star',
  'favorite',
  'thumb',
  'button',
  'smiley',
  'crown',
  'trophy',
  'fingers',
  'fire',
  'party',
  'skull',
  'dollar',
  'virus'
];

export const questionSchema = Joi => ({
  type: Joi.string()
    .required()
    .valid(...questionTypes),
  input: Joi.any()
    .when('type', {
      is: 'text',
      then: Joi.string().valid('number', 'phone', 'email', 'date'),
      otherwise: Joi.forbidden()
    }),
  defaultCode: Joi.string(),
  general: Joi.boolean(),
  trend: Joi.boolean(),
  hideIcons: Joi.boolean(),
  isGlobal: Joi.boolean(),
  textComment: Joi.boolean(),
  randomize: Joi.boolean(),

  // net promoter scope comments
  detractorsComment: localizeValidations(Joi, 'general.name'),
  detractorsPlaceholder: localizeValidations(Joi, 'question.placeholder'),
  translationLockDetractorsComment: localizeValidations(Joi, 'general.translationLockName'),
  translationLockDetractorsPlaceholder: localizeValidations(Joi, 'general.translationLockName'),
  passivesComment: localizeValidations(Joi, 'general.name'),
  passivesPlaceholder: localizeValidations(Joi, 'question.placeholder'),
  translationLockPassivesComment: localizeValidations(Joi, 'general.translationLockName'),
  translationLockPassivesPlaceholder: localizeValidations(Joi, 'general.translationLockName'),
  promotersComment: localizeValidations(Joi, 'general.name'),
  promotersPlaceholder: localizeValidations(Joi, 'question.placeholder'),
  translationLockPromotersComment: localizeValidations(Joi, 'general.translationLockName'),
  translationLockPromotersPlaceholder: localizeValidations(Joi, 'general.translationLockName'),

  // translation
  translation: Joi.object().keys(localizeValidations(Joi, 'general.translation')).required(),

  // name
  name: localizeValidations(Joi, 'general.name'),
  translationLockName: Joi.object().keys(localizeValidations(Joi, 'general.translationLockName')),

  // description
  description: Joi.object().keys(localizeValidations(Joi, 'general.description')),
  translationLockDescription: Joi.object().keys(localizeValidations(Joi, 'general.translationLockDescription')),

  translationLockLinearScaleFromCaption: Joi.object().keys(localizeValidations(Joi, 'question.translationLockLinearScaleFromCaption')),
  translationLockLinearScaleToCaption: Joi.object().keys(localizeValidations(Joi, 'question.translationLockLinearScaleToCaption')),

  placeholder: Joi.object()
    .when('type', {
      is: 'text',
      then: localizeValidations(Joi, 'question.placeholder'),
      otherwise: {}
    }),
  linearScale: Joi.object() // TODO tests to not allow pass data with another types
    .when('type', {
      is: 'linearScale',
      then: Joi.object({
        from: Joi.number()
          .required(),
        fromCaption: Joi.object(localizeValidations(Joi, 'question.fromCaption')),
        to: Joi.number()
          .required(),
        toCaption: Joi.object(localizeValidations(Joi, 'question.toCaption')),
        icon: Joi.string()
          .required()
          .valid(...iconTypes)
      })
        .required()
    })
    .when('type', {
      is: 'slider',
      then: Joi.object({
        from: Joi.number()
          .lessThan(Joi.ref('to'), 'Max')
          .required(),
        fromCaption: Joi.object(localizeValidations(Joi, 'question.fromCaption')),
        to: Joi.number()
          .required(),
        toCaption: Joi.object(localizeValidations(Joi, 'question.toCaption')),
      })
        .required()
    })
    .when('type', {
      is: 'netPromoterScore',
      then: Joi.object({
        fromCaption: Joi.object(localizeValidations(Joi, 'question.fromCaption')),
        toCaption: Joi.object(localizeValidations(Joi, 'question.toCaption')),
      })
    })
    .when('type', {
      is: 'thumbs',
      then: Joi.object({
        fromCaption: Joi.object(localizeValidations(Joi, 'question.fromCaption')),
        toCaption: Joi.object(localizeValidations(Joi, 'question.toCaption')),
      }),
      otherwise: {} // clear rest types
    }),

  // date text question params
  dateParams: Joi.object({
    type: Joi.string().valid('date', 'dateAndTime', 'range', 'rangeAndTime'),
    dateFormat: Joi.string().valid('ddmmyyyy', 'mmddyyyy', 'yyyymmdd'),
    timeFormat: Joi.string().valid('twelveHourFormat', 'twentyFourHourFormat'),
    startDate: Joi.string().allow(null),
    startTime: Joi.string().allow(null),
    endDate: Joi.string().allow(null),
    endTime: Joi.string().allow(null),
    default: Joi.boolean()
  }),

  questionItems: Joi.array()
    .when('quiz', {
      is: true,
      then: localizeValidations(Joi, 'questionItemsQuiz'),
      otherwise: localizeValidations(Joi, 'itemsArray')
    }),

  gridRows: localizeValidations(Joi, 'itemsArray'),

  gridColumns: Joi.alternatives()
    .when('type', {
      is: Joi.only(['multipleChoiceMatrix', 'checkboxMatrix']),
      then: localizeValidations(Joi, 'gridColumnMatrixArray'),
      otherwise: localizeValidations(Joi, 'itemsArray')
    }),

  // quiz
  quiz: Joi.boolean(),
  quizCondition: Joi.string().valid('equal', 'greaterEqual', 'lessEqual', 'isBetween'),
  quizCorrectValue: Joi.alternatives([
    Joi.string().allow(null).allow(''),
    Joi.number()
  ]),
  quizCorrectRange: Joi.object({
    from: Joi.number(),
    to: Joi.number()
  }),
  quizCorrectText: Joi.object().keys(localizeValidations(Joi, 'surveyItem.html')),
  quizIncorrectText: Joi.object().keys(localizeValidations(Joi, 'surveyItem.html')),
  quizCorrectTextTranslationLock: Joi.object().keys(localizeValidations(Joi, 'general.translationLockName')),
  quizIncorrectTextTranslationLock: Joi.object().keys(localizeValidations(Joi, 'general.translationLockName'))
});

export const trendQuestionSchema = Joi => ({
  questionItems: Joi.array()
    .items(Joi.object({
      _id: Joi.string(),
    }))
});

// POST Create - /api/v1/questions
function create(Joi) {
  return {
    body: Joi.object(questionSchema(Joi))
      .when(
        Joi.object({ general: Joi.not(true), trend: Joi.not(true) }), {
          then: Joi.object({
            general: Joi.only(true).error(questionReusableTypeError) // TODO tests
          })
        }
      )
  };
}

// PUT Update - /api/v1/questions/:id
function update(Joi) {
  return {
    body: Joi.object(questionSchema(Joi))
      .when(
        Joi.object({ general: Joi.not(true), trend: Joi.not(true) }), {
          then: Joi.object({
            general: Joi.only(true).error(questionReusableTypeError) // TODO tests
          })
        }
      ),
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

// PUT Translate - /api/v1/questions/:id/translate
function translate(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    body: Joi.object({
      from: Joi.string()
        .required()
        .valid(...localizationList),
      to: Joi.string()
        .required()
        .valid(...localizationList)
    })
  };
}

// POST Translate - /api/v1/questions/:id/remove-translation
function removeTranslation(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    body: Joi.object({
      lang: Joi.string()
        .valid(...localizationList)
        .required()
    })
  };
}

// DELETE Destroy - /api/v1/questions/:id
function destroy (Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

// GET /api/v1/questions/:id/surveys - return surveys by question
function questionSurveys(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

// POST /api/v1/questions/:id/clone-from-survey - clones question from survey with General/Trend type
function questionCloneFromSurvey(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    body: Joi.object({
      type: Joi.alternatives(['general', 'trend'])
        .required()
    })
  };
}

// GET /api/v1/questions/:id/custom-answers - return custom answers by trend question
function customAnswers(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    query: Joi.object({
      surveys: Joi.alternatives([
        Joi.array().items(Joi.objectId()),
        Joi.objectId()
      ]),
      from: Joi.date(),
      to: Joi.date(),
      value: Joi.alternatives([
        Joi.array().items(Joi.number()),
        Joi.number()
      ]),
      skip: Joi.number(),
      limit: Joi.number(),
      sort: Joi.string()
        .valid('asc', 'desc')
    })
  };
}

export default {
  create,
  update,
  questionSurveys,
  questionCloneFromSurvey,
  customAnswers,
  translate,
  removeTranslation,
  destroy
};
