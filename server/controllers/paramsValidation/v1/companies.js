// GET List - /api/v1/companies
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
      email: Joi.string()
        .trim(),
      urlName: Joi.string().trim(),
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
          type: Joi.string()
            .trim()
        })
    })
  };
}

// PUT Update - /api/v1/companies/:id
function update(Joi) {
  return {
    body: Joi.object({
      name: Joi.string()
        .trim(),
      email: Joi.string()
        .email()
        .trim(),
      urlName: Joi.string()
        .trim(),
      address: Joi.object()
        .keys({
          street: Joi.string()
            .trim()
            .allow(''),
          city: Joi.string()
            .trim()
            .allow(''),
          zipCode: Joi.string()
            .trim()
            .allow(''),
          country: Joi.string()
            .trim()
            .allow(''),
        }),
      colors: Joi.object({
        primary: Joi.string()
          .trim()
          .allow('')
          .regex(/^#[A-Fa-f0-9]{6}$/),
        secondary: Joi.string()
          .trim()
          .allow('')
          .regex(/^#[A-Fa-f0-9]{6}$/)
      }),
      logo: Joi.alternatives([
        Joi.object().allow(null), // allow remove logo
        Joi.string()
      ])
    })
  };
}

// POST /api/v1/companies/future-request
function futureRequest(Joi) {
  return {
    body: Joi.object({
      count: Joi.number()
        .required()
    })
  };
}

export default {
  update,
  list,
  futureRequest
};
