// GET show - /api/v2/survey-items/:id
function show(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required(),
    })
  };
}

// POST generateLinks - /api/v2/survey-items/:id/generate-links
function generateLinks(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    body: Joi.object({
      invitations: Joi.array()
        .items(
          Joi.object({
            email: Joi.string()
              .required(),
            meta: Joi.object(),
            ttl: Joi.number(),
          })
        )
        .required(),
      ttl: Joi.number()
    })
  };
}

export default { show, generateLinks };
