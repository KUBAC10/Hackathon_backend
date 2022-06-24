// localization
import { localizationList } from '../../../../config/localization';

const regExpObjectId = /^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i; // TODO add new type to Joi
const regExpCustomAnswer = /_customAnswer/i;

const answerSchema = Joi => ({
  clientIp: Joi.string()
    .trim(),
  token: Joi.string()
    .trim(),
  surveyId: Joi.objectId()
    .when('token', {
      is: Joi.any().forbidden(),
      then: Joi.required()
    }),
  fingerprintId: Joi.string()
    .trim()
    .when('token', {
      is: Joi.any().forbidden(),
      then: Joi.required()
    }),
  assets: Joi.alternatives(
    [
      Joi.array()
        .items(
          Joi.objectId()
        ),
      Joi.objectId()
    ]),
  lang: Joi.string()
    .valid(...localizationList)
});

// POST Survey answer - /api/v1/survey-answers
function create(Joi) {
  return {
    body: Joi.object({
      ...answerSchema(Joi),
      meta: Joi.object(),
      targetId: Joi.string(),
      answer: Joi.object()
        .pattern(Joi.objectId(), [Joi.string()])
    })
  };
}

// PUT Add items to survey result - /api/v1/survey-answers
function update(Joi) {
  return {
    body: Joi.object({
      ...answerSchema(Joi),
      answer: Joi.object()
        .pattern(regExpObjectId, [
          Joi.string(),
          Joi.number(),
          Joi.array().items(
            Joi.objectId(),
            Joi.object().keys({
              row: Joi.objectId().required(),
              column: Joi.objectId().required()
            }) // TODO: Make better errors
          )
        ])
        .pattern(regExpCustomAnswer, [Joi.string()])
        .required(),
      useragent: Joi.object({
        isDesktop: Joi.boolean(),
        isMobile: Joi.boolean(),
        isTablet: Joi.boolean()
      })
    })
  };
}

// GET get previous step - /api/v1/survey-answers/prev-step
function stepBack(Joi) {
  return {
    query: Joi.object(answerSchema(Joi)),
  };
}

// GET get first survey step - /api/v1/survey-answers/restart-answer
function restartSurvey(Joi) {
  return {
    query: Joi.object(answerSchema(Joi)),
  };
}

// GET Get survey data for answer process - /api/v1/survey-answers
function show(Joi) {
  return {
    query: Joi.object(answerSchema(Joi)),
  };
}

export default {
  show,
  create,
  update,
  stepBack,
  restartSurvey
};
