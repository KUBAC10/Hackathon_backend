// GET List - /api/v1/global-templates
function list(Joi) {
  return {
    query: Joi.object({
      limit: Joi.number()
        .required()
        .valid(5, 10, 25, 50, 100),
    })
  };
}

// GET Show - /api/v1/global-templates/:id
function show(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

export default { show, list };
