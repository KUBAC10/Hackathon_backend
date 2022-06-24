// POST Create - /api/v1/teams
function create(Joi) {
  return {
    body: Joi.object({
      name: Joi.string()
        .trim()
        .required(),
      description: Joi.string()
        .trim()
    }),
    params: Joi.object({
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

// PUT Update - /api/v1/teams/:id
function update(Joi) {
  return {
    body: Joi.object({
      name: Joi.string()
        .trim(),
      description: Joi.string()
        .trim(),
      logo: Joi.alternatives([
        Joi.object().allow(null), // allow remove logo
        Joi.string()
      ])
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

// GET List - /api/v1/teams
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
      withoutUserTeams: Joi.string()
        .trim(),
      createdBy: Joi.string()
        .trim(),
      updatedBy: Joi.string()
        .trim(),
      skip: Joi.number(),
      limit: Joi.number()
        .required()
        .valid(5, 10, 25, 50, 100, 1000),
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

// GET Show - /api/v1/teams/:id
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

// DELETE Destroy - /api/v1/teams/:id
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
