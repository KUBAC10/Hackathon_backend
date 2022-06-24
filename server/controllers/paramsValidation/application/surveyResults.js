// GET /api/v1/survey-results
function list(Joi) {
  return {
    query: Joi.object({
      tags: Joi.alternatives([
        Joi.objectId(),
        Joi.array()
          .items(Joi.objectId()),
      ]),
      survey: Joi.string()
        .trim(),
      contact: Joi.string()
        .trim(),
      completed: Joi.boolean(),
      startedAt: Joi.object()
        .keys({
          $eq: Joi.date(),
          $lte: Joi.date(),
          $gte: Joi.date()
        }),
      createdAt: Joi.object()
        .keys({
          $eq: Joi.date(),
          $lte: Joi.date(),
          $gte: Joi.date()
        }),
      createdBy: Joi.string()
        .trim(),
      location: Joi.string()
        .trim(),
      search: Joi.string()
        .trim(),
      from: Joi.date()
        .min('01-01-2018')
        .max('12-31-2199'),
      to: Joi.date()
        .min('01-01-2018')
        .max('12-31-2199'),
      skip: Joi.number(),
      limit: Joi.number()
        .required()
        .valid(5, 10, 25, 50, 100, 1000),
      sort: Joi.object()
        .keys({
          createdAt: Joi.string()
            .trim(),
          completed: Joi.string()
            .trim(),
          startedAt: Joi.string()
            .trim(),
          step: Joi.string()
            .trim(),
          location: Joi.string()
            .trim()
        }),
      targets: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      ),
      campaigns: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      )
    }),
    params: Joi.object({
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

// GET /api/v1/survey-results/:id
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

export default { list, show };
