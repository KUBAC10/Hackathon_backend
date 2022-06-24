import { localizationList } from '../../../../config/localization';

// GET Get public survey base data - /api/v1/surveys/:companyUrlName/:surveyUrlName
function base(Joi) {
  return {
    params: Joi.object({
      companyUrlName: Joi.string()
        .trim()
        .required(),
      surveyUrlName: Joi.string()
        .trim()
        .required()
    }),
  };
}

// GET Get survey base data by token - /api/v1/surveys/by-token/:token
function baseByToken(Joi) {
  return {
    params: Joi.object({
      token: Joi.string()
        .required()
    })
  };
}

/** GET /api/v1/surveys/:id/download-result-csv - export survey to csv file */
function downloadResultsCSV(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    query: Joi.object({
      language: Joi.string()
        .valid(...localizationList)
        .required()
    })
  };
}

/** GET /api/v1/surveys/:id/count-fake-data - return fake data counter */
function countFakeData(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
  };
}

/** GET /api/v1/surveys/:id/count-hidden-responses - return hidden responses counter */
function countHiddenResponses(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
  };
}

// POST Generate fake data - /api/v1/surveys/:id/generate-fake-data
function generateFakeData(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    body: Joi.object({
      numberOfResults: Joi.number().positive().max(500),
      tags: Joi.alternatives([
        Joi.objectId(),
        Joi.array()
          .items(Joi.objectId()),
      ]),
      targets: Joi.alternatives(
        Joi.objectId(),
        Joi.array()
          .items(Joi.objectId()),
      ),
    })
  };
}

// DELETE Remove fake data - /api/v1/surveys/:id/remove-fake-data
function removeFakeData(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

// PUT Remove logo - /api/v1/surveys/:id/remove-logo
function removeLogo(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
  };
}

// DELETE Destroy - /api/v1/surveys/:id
function destroy(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

/** GET /api/v1/surveys/:id/tags - return tags list by survey campaigns */
function tags(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    query: Joi.object({
      value: Joi.string()
    })
  };
}

/** GET /api/v1/surveys/:id/public-template - return public template */
function publicTemplate(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

/** GET /api/v1/surveys/:id/public-template-link - return link for public template */
function publicTemplateLink(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

/** GET /api/v1/surveys/:companyUrlName/target/:token - return survey base by target token */
function targetBase(Joi) {
  return {
    params: Joi.object({
      companyUrlName: Joi.string()
        .required(),
      token: Joi.string()
        .required()
    })
  };
}

export default {
  base,
  destroy,
  baseByToken,
  countFakeData,
  countHiddenResponses,
  removeFakeData,
  generateFakeData,
  removeLogo,
  downloadResultsCSV,
  tags,
  publicTemplate,
  publicTemplateLink,
  targetBase
};
