// GET List - /api/v1/users
function list(Joi) {
  return {
    query: Joi.object({
      name: Joi.string()
        .trim(),
      email: Joi.string()
        .trim(),
      phoneNumber: Joi.string()
        .trim(),
      address: Joi.object()
        .keys({
          street: Joi.string()
            .trim(),
          city: Joi.string()
            .trim(),
          zipCode: Joi.string()
            .trim(),
          country: Joi.string()
            .trim()
        }),
      skip: Joi.number(),
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
      withoutTeamUsers: Joi.string()
        .trim(),
      updatedBy: Joi.string()
        .trim(),
      limit: Joi.number()
        .required()
        .valid(5, 10, 25, 50, 100, 1000),
      sort: Joi.object()
        .keys({
          'name.first': Joi.string()
            .trim(),
          'name.last': Joi.string()
            .trim(),
          createdAt: Joi.string()
            .trim(),
          email: Joi.string()
            .trim(),
          phoneNumber: Joi.string()
            .trim(),
          'address.street': Joi.string()
            .trim(),
          'address.zipCode': Joi.string()
            .trim(),
          'address.city': Joi.string()
            .trim(),
          updatedAt: Joi.string()
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

// GET Show - /api/v1/users/:id
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

// DELETE Destroy - /api/v1/users/:id
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

export default { list, show, destroy };
