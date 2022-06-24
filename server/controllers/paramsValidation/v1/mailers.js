const mailerSchema = Joi => Joi.object({
  name: Joi.string()
    .required(),
  type: Joi.string()
    .required()
    .valid('surveyComplete', 'surveyInvitation', 'questionNotification'),
  subject: Joi.string()
    .trim()
    .allow('')
    .required(),
  template: Joi.string()
    .trim()
    .allow('')
    .required(),
  smsTemplate: Joi.string()
    .trim()
    .allow('')
    .allow(null)
});

// POST Create mailer - /api/v1/mailers
function create(Joi) {
  return {
    body: mailerSchema(Joi)
  };
}

// PUT Update mailer - /api/v1/mailers/:id
function update(Joi) {
  return {
    body: mailerSchema(Joi),
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

// DELETE Create mailer - /api/v1/mailers/:id
function destroy(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

// GET Mailer template sample - /api/v1/mailers/templateSample
function templateSample(Joi) {
  return {
    query: Joi.object({
      type: Joi.string()
        .required()
        .trim()
    })
  };
}

export default { create, update, destroy, templateSample };
