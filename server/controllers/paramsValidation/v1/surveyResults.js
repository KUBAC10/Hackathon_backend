/** DELETE /api/v1/survey-results/batch-remove - Delete results by idsArray */
function batchRemove(Joi) {
  return {
    body: Joi.object({
      idsArray: Joi.array()
        .items(
          Joi.objectId()
            .required()
        ),
    })
  };
}

/** GET /api/v1/survey-results/recipients - get recipients results list */
function recipientResults(Joi) {
  return {
    query: Joi.object({
      survey: Joi.objectId().required(),
      skip: Joi.number(),
      limit: Joi.number(),
      sort: Joi.object({
        lastAnswerDate: Joi.string()
          .trim()
      }),
      tags: Joi.alternatives([
        Joi.objectId(),
        Joi.array()
          .items(Joi.objectId()),
      ])
    })
  };
}

/** GET /api/v1/survey-results/recipients/:id - get recipients result */
function recipientResult(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    query: Joi.object({
      survey: Joi.objectId()
        .required()
    })
  };
}

export default {
  batchRemove,
  recipientResults,
  recipientResult
};
