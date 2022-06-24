function surveyStats(Joi) {
  return {
    query: Joi.object({
      surveyId: Joi.objectId()
        .required()
    }),
  };
}

// GET reports data by survey - /api/v1/reports/survey
function dataBySurvey(Joi) {
  return {
    query: Joi.object({
      surveyId: Joi.objectId()
        .required(),
      stats: Joi.boolean(),
      prevPeriod: Joi.boolean(),
      perDay: Joi.boolean(),
      assets: Joi.alternatives([Joi.array()
        .items(
          Joi.objectId()
        ), Joi.objectId()]),
      range: Joi.object({
        from: Joi.date()
          .timestamp(),
        to: Joi.date()
          .timestamp(),
        overall: Joi.boolean(),
        summary: Joi.boolean()
      })
    })
  };
}

// GET reports data by question - /api/v1/reports/question
function dataByQuestion(Joi) {
  return {
    query: Joi.object({
      reportId: Joi.objectId(),
      surveys: Joi.alternatives([
        Joi.array().items(Joi.objectId()),
        Joi.objectId()
      ]),
      questionId: Joi.objectId()
        .required(),
      surveyItemId: Joi.objectId(),
      questionItemId: Joi.objectId(),
      perDay: Joi.boolean(),
      prevPeriod: Joi.boolean(),
      assets: Joi.alternatives([Joi.array()
        .items(
          Joi.objectId()
        ), Joi.objectId()]),
      range: Joi.object({
        from: Joi.date(),
        to: Joi.date(),
        overall: Joi.boolean(),
        summary: Joi.boolean(),
      }),
      text: Joi.object({
        skip: Joi.number().required(),
        limit: Joi.number()
          .required()
          .valid(5, 10, 25, 50, 100, 1000),
      })
    })
  };
}

// GET Return fonts by language - /api/v1/reports/fonts
function fontsByLanguage(Joi) {
  return {
    query: Joi.object({
      lang: Joi.string()
        .trim()
        .required()
    })
  };
}

export default { surveyStats, dataBySurvey, dataByQuestion, fontsByLanguage };
