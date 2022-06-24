// POST Create token for survey preview - /api/v1/survey-preview/
function create(Joi) {
  return {
    body: Joi.object({
      surveyId: Joi.objectId()
        .required(),
      type: Joi.string()
        .required()
        .valid('company', 'team', 'global')
        .trim(),
      team: Joi.objectId(),
      company: Joi.objectId(),
      ttl: Joi.number().positive()
    })
      .when(Joi.object({ type: 'team' }), {
        then: { team: Joi.required() }
      })
  };
}

// GET List of tokens for survey preview - /api/v1/survey-preview/
function list(Joi) {
  return {
    query: Joi.object({
      surveyId: Joi.objectId()
        .required(),
      skip: Joi.number(),
      limit: Joi.number()
        .required()
        .valid(5, 10, 25, 50, 100, 1000)
    })
  };
}

// DELETE Destroy - /api/v1/survey-preview/:id
function destroy(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

export default { create, list, destroy };
