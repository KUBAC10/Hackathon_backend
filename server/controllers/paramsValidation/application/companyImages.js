// PUT Update - /api/v1/company-images/:id
function update(Joi) {
  return {
    body: Joi.object({
      name: Joi.string()
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

// GET Show - /api/v1/company-images/:id
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

// GET List - /api/v1/company-images
function list(Joi) {
  return {
    query: Joi.object({
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
      name: Joi.string()
        .trim(),
      createdBy: Joi.string()
        .trim(),
      updatedBy: Joi.string()
        .trim(),
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
            .trim()
        }),
    }),
    params: Joi.object({
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

// DELETE Destroy - /api/v1/company-images/:id
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

export default {
  update,
  show,
  list,
  destroy
};
