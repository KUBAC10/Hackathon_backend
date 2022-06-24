// POST Create - /api/v1/contacts
function create(Joi) {
  return {
    body: Joi.object({
      name: Joi.object()
        .keys({
          first: Joi.string()
            .trim(),
          last: Joi.string()
            .trim()
        }),
      email: Joi.string()
        .trim()
        .required(),
      phoneNumber: Joi.string()
        .trim(),
      user: Joi.string()
        .trim(),
      tags: Joi.alternatives([
        Joi.array().items(Joi.objectId()),
        Joi.objectId()
      ]),
    }),
    params: Joi.object({
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

// PUT Update - /api/v1/contacts/:id
function update(Joi) {
  return {
    body: Joi.object({
      name: Joi.object()
        .keys({
          first: Joi.string()
            .trim().allow(''),
          last: Joi.string()
            .trim().allow('')
        }),
      email: Joi.string()
        .trim(),
      phoneNumber: Joi.string()
        .trim(),
      user: Joi.string()
        .trim(),
      tags: Joi.alternatives([
        Joi.array().items(Joi.objectId()),
        Joi.objectId()
      ]),
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

// GET List - /api/v1/contacts
function list(Joi) {
  return {
    query: Joi.object({
      name: Joi.string()
        .trim(),
      tagName: Joi.string()
        .trim(),
      email: Joi.string()
        .trim(),
      phoneNumber: Joi.string()
        .trim(),
      tags: Joi.alternatives([
        Joi.array().items(Joi.objectId()),
        Joi.objectId()
      ]),
      createdAt: Joi.object()
        .keys({
          from: Joi.date(),
          to: Joi.date()
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
      limit: Joi.number()
        .required()
        .valid(5, 10, 25, 50, 100, 1000),
      sort: Joi.object()
        .keys({
          createdAt: Joi.string()
            .trim(),
          'name.first': Joi.string()
            .trim(),
          'name.last': Joi.string()
            .trim(),
          updatedAt: Joi.string()
            .trim(),
          email: Joi.string()
            .trim(),
          team: Joi.string()
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

// GET Show - /api/v1/contacts/:id
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

// DELETE Destroy - /api/v1/contacts/:id
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
