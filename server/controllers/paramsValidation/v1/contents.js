// GET Show - /api/v1/contents
function show(Joi) {
  return {
    query: Joi.object({
      lang: Joi.string()
        .trim()
        .required(),
      getCSV: Joi.string()
        .trim()
    })
  };
}

export default { show };
