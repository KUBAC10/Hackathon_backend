// GET show - /scripts/embed-survey
function show(Joi) {
  return {
    query: Joi.object({
      s: Joi.string()
        .required(),
      t: Joi.string(),
      btnL: Joi.string(),
      c: Joi.string().required(),
      cId: Joi.string(),
      i: Joi.string(),
      sp: Joi.string(),
      w: Joi.string(),
      h: Joi.string(),
      hH: Joi.string(),
      hF: Joi.string(),
      cmp: Joi.string(),
      team: Joi.string(),
    })
  };
}

export default { show };
