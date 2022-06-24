// GET /api/v1/tableau/generate-token - generate access token for tableau
function generateToken(Joi) {
  return {
    query: Joi.object({
      surveyId: Joi.string()
        .required()
    })
  };
}

// GET /api/v1/tableau/:token - return data for tableau by access token
function data(Joi) {
  return {
    params: Joi.object({
      token: Joi.string()
        .required()
    })
  };
}

export default { data, generateToken };
