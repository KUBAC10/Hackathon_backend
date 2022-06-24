// PUT Update - /api/v1/company-open-text
function update(Joi) {
  return {
    body: Joi.object({
      active: Joi.bool(),
      requiredNotifications: Joi.bool(),
      popupMessage: Joi.string().allow(''),
      disableTextQuestions: Joi.bool()
    })
  };
}

// GET - /api/v1/company-open-text
function getCompanyConfig(Joi) {
  return {
    query: Joi.object({
      surveyId: Joi.objectId()
    })
  };
}

// GET - /api/v1/company-open-text/consent
function show(Joi) {
  return {
    query: Joi.object({
      survey: Joi.objectId()
    })
  };
}

// POST - /api/v1/company-open-text/consent
function create(Joi) {
  return {
    body: Joi.object({
      survey: Joi.objectId()
    })
  };
}

export default { show, create, update, getCompanyConfig };
