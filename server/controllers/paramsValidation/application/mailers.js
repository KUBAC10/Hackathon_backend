function list(Joi) {
  return {
    // GET List - /api/v1/mailers
    query: Joi.object({
      name: Joi.string()
        .trim(),
      withoutBase: Joi.boolean(),
      type: Joi.string()
        .trim(),
      skip: Joi.number(),
      limit: Joi.number()
        .required()
        .valid(5, 10, 25, 50, 100, 1000),
      createdAt: Joi.object()
        .keys({
          $eq: Joi.date(),
          $lte: Joi.date(),
          $gte: Joi.date()
        }),
      updatedAt: Joi.object()
        .keys({
          $eq: Joi.date(),
          $lte: Joi.date(),
          $gte: Joi.date()
        }),
      createdBy: Joi.string()
        .trim(),
      updatedBy: Joi.string()
        .trim(),
      sort: Joi.object()
        .keys({
          name: Joi.string()
            .trim(),
          updatedAt: Joi.string()
            .trim(),
          createdAt: Joi.string()
            .trim(),
        })
    }),
    params: Joi.object({
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

function show(Joi) {
  return {
    // GET Show - /api/v1/mailers/:id
    params: Joi.object({
      id: Joi.objectId()
        .required(),
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

export default { list, show };
