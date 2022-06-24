const side = Joi => ({
  surveyItem: Joi.objectId()
    .required(),
  questionItem: Joi.objectId(),
  country: Joi.objectId()
});

function calculateCorrelation(Joi) {
  return {
    query: Joi.object({
      left: Joi.object(side(Joi)).required(),
      right: Joi.object(side(Joi)).required(),
      range: Joi.object({
        from: Joi.date()
          .timestamp(),
        to: Joi.date()
          .timestamp(),
        overall: Joi.boolean(),
      })
    })
  };
}

export default { calculateCorrelation };
