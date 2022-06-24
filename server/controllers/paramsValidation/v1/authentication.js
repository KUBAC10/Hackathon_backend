/** POST /api/v1/authentication - Login User */
function login(Joi) {
  return {
    body: Joi.object({
      login: Joi.string()
        .trim()
        .required(),
      password: Joi.string()
        .trim()
        .required()
    })
  };
}

/** POST /api/v1/authentication/oauth - Register or login LITE user via social network */
function oAuth(Joi) {
  return {
    body: Joi.object({
      code: Joi.string()
        .trim(),
      provider: Joi.string()
        .valid('linkedin', 'google')
        .required()
    })
  };
}

export default { login, oAuth };
