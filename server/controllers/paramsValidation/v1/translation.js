import { localizationList } from '../../../../config/localization';

const entities = ['survey', 'surveySection', 'question', 'questionItem', 'gridRow', 'gridColumn', 'contentItem', 'contentItemElement'];
const surveyFields = ['name', 'description', 'footer.text', 'footer.content', 'references.content'];
const surveySectionFields = ['name', 'description'];
const questionFields = ['name', 'description', 'placeholder', 'linearScale.fromCaption', 'linearScale.toCaption', 'quizCorrectText', 'quizIncorrectText', 'detractorsComment', 'detractorsPlaceholder', 'passivesComment', 'passivesPlaceholder', 'promotersComment', 'promotersPlaceholder'];
const questionItemFields = ['name', 'quizResultText'];
const gridFields = ['name'];

/** GET /api/v1/translation - get list of languages */
function list(Joi) {
  return {
    query: Joi.object({
      name: Joi.string()
    })
  };
}

/** POST /api/v1/translation/:id - translate survey to selected lang */
function translateSurvey(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId().required()
    }),
    body: Joi.object({
      lang: Joi.string().valid(...localizationList).required()
    })
  };
}

/** GET /api/v1/translation/:id - get field translation */
function translateField(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId().required()
    }),
    query: Joi.object({
      entity: Joi.string().valid(...entities).required(),
      entityId: Joi.objectId().required()
    })
      .when(Joi.object({ entity: 'survey' }), {
        then: {
          field: Joi.string().valid(...surveyFields).required()
        }
      })
      .when(Joi.object({ entity: 'surveySection' }), {
        then: {
          field: Joi.string().valid(...surveySectionFields).required()
        }
      })
      .when(Joi.object({ entity: 'question' }), {
        then: {
          field: Joi.string().valid(...questionFields).required()
        }
      })
      .when(Joi.object({ entity: 'questionItem' }), {
        then: {
          field: Joi.string().valid(...questionItemFields).required()
        }
      })
      .when(Joi.object({ entity: Joi.only('gridRow', 'gridColumn') }), {
        then: {
          field: Joi.string().valid(...gridFields).required()
        }
      })
      .when(Joi.object({ entity: 'contentItem' }), {
        then: {
          field: Joi.string().valid('title', 'text', 'html').required()
        }
      })
      .when(Joi.object({ entity: 'contentItemElement' }), {
        then: {
          field: Joi.string().valid('linkText').required()
        }
      })
  };
}

/** GET /api/v1/translation/:id/remove - remove translation */
function removeTranslation(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId().required()
    }),
    query: Joi.object({
      lang: Joi.string().valid(...localizationList).required()
    })
  };
}

/** GET /api/v1/translation/:id/switch - switch default language */
function switchDefaultLanguage(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId().required()
    }),
    query: Joi.object({
      lang: Joi.string().valid(...localizationList).required()
    })
  };
}


export default {
  list,
  translateSurvey,
  translateField,
  removeTranslation,
  switchDefaultLanguage
};
