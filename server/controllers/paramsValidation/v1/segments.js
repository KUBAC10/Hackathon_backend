export const segmentsSchema = Joi => Joi.object({
  surveyReportId: Joi.objectId(),
  surveyItems: Joi.array()
    .items(Joi.objectId()),
  filters: Joi.object({
    assets: Joi.array().items(Joi.objectId()),
    quizCorrect: Joi.object({
      from: Joi.number(),
      to: Joi.number(),
    }),
    quizTotal: Joi.object({
      from: Joi.number(),
      to: Joi.number(),
    }),
    createdAt: Joi.object({
      from: Joi.date(),
      to: Joi.date(),
    }),
  }),
  answers: Joi.array()
    .items(Joi.object({
      surveyItem: Joi.objectId().required(),
      assets: Joi.array().items(Joi.objectId()),
      questionItems: Joi.array().items(Joi.objectId()),
      gridRow: Joi.objectId(),
      gridColumn: Joi.objectId(),
      value: Joi.alternatives([
        Joi.string(),
        Joi.array().items(Joi.number()),
        Joi.array().items(Joi.string())
      ]),
      customAnswer: Joi.string(),
      country: Joi.alternatives([
        Joi.objectId(),
        Joi.array().items(Joi.objectId())
      ]),
      crossings: Joi.array().items(Joi.object({
        gridRow: Joi.objectId().required(),
        gridColumn: Joi.objectId().required()
      }))
    }))
});

function filters(Joi) {
  return {
    body: segmentsSchema(Joi)
  };
}

export default { filters };
