// POST Create - /api/v1/tags
function create(Joi) {
  return {
    body: Joi.object({
      name: Joi.string()
        .required()
        .trim(),
      description: Joi.string()
        .trim(),
      color: Joi.string()
        .trim()
    }),
    params: Joi.object({
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

// PUT Update - /api/v1/tags/:id
function update(Joi) {
  return {
    body: Joi.object({
      name: Joi.string()
        .trim(),
      description: Joi.string()
        .trim()
        .allow(''),
      color: Joi.string()
        .trim()
    }),
    params: Joi.object({
      id: Joi.objectId()
        .required(),
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

// GET List - /api/v1/tags
function list(Joi) {
  return {
    query: Joi.object({
      name: Joi.string()
        .trim(),
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
      skip: Joi.number(),
      isGlobal: Joi.boolean(),
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
    }),
    params: Joi.object({
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

// GET Show - /api/v1/tags/:id
function show(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required(),
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

// DELETE Destroy - /api/v1/tags/:id
function destroy(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required(),
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

export default { create, update, list, show, destroy };
