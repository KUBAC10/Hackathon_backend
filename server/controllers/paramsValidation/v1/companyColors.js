const companyColorsSchema = Joi => Joi.object({
  value: Joi.string()
    .regex(/^#[A-Fa-f0-9]{6}$/)
    .required(),
  _id: Joi.string()
});

// PUT Update - /api/v1/company-colors/:id
function update(Joi) {
  return {
    body: Joi.object({
      colors: Joi.object({
        primary: Joi.string()
          .trim()
          .allow('')
          .regex(/^#[A-Fa-f0-9]{6}$/),
        secondary: Joi.string()
          .trim()
          .allow('')
          .regex(/^#[A-Fa-f0-9]{6}$/)
      }),
      companyColors: Joi.array()
        .items(companyColorsSchema(Joi))
    })
  };
}

export default { update };

