// GET Show - /api/v1/terms
function show(Joi) {
  return {
    query: Joi.object({
      lang: Joi.string()
        .trim()
        .required()
    })
  };
}

export default { show };
