function list(Joi) {
  return {
    query: Joi.object({
      name: Joi.string()
        .trim(),
      skip: Joi.number(),
      limit: Joi.number(),
      sort: Joi.object()
        .keys({
          createdAt: Joi.string()
            .trim(),
          name: Joi.string()
            .trim()
        }),
      answerList: Joi.boolean()
    })
  };
}

export default { list };
