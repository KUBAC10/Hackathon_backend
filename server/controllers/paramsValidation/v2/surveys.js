function list(Joi) {
  return {
    query: Joi.object({
      skip: Joi.number(),
      limit: Joi.number()
        .required()
        .valid(5, 10, 25, 50, 100),
      sort: Joi.object()
        .keys({
          createdAt: Joi.string()
            .trim(),
          updatedAt: Joi.string()
            .trim(),
          name: Joi.string()
            .trim(),
        }),
    })
  };
}

// GET show - /api/v2/surveys/:id
function show(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

// POST firstQuestionHtml - /api/v2/surveys/:id/
function firstQuestionHtml(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    query: Joi.object({
      lang: Joi.string(),
      meta: Joi.object(),
      ttl: Joi.number(),
      targetId: Joi.string()
    })
  };
}


export default {
  list,
  show,
  firstQuestionHtml
};
