// POST Create - /api/v1/contact-us
function create(Joi) {
  return {
    body: Joi.object({
      email: Joi.string()
        .trim()
        .required(),
      name: Joi.string()
        .trim()
        .required(),
      comment: Joi.string()
        .trim()
    })
  };
}

export default { create };
