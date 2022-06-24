const validTypes = ['location', 'product'];

const assetsSchema = Joi => Joi.object({
  name: Joi.string()
    .required()
    .trim(),
  description: Joi.string()
    .trim(),
  type: Joi.string()
    .required()
    .trim()
    .valid(...validTypes)
});

function surveyLinksCSV(Joi) {
  return {
    query: Joi.object({
      surveyId: Joi.objectId()
        .required()
    })
  };
}

export default { assetsSchema, surveyLinksCSV };
