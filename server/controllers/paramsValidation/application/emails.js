// localization helpers
import { localizationList } from '../../../../config/localization';

function list(Joi) {
  return {
    // GET List - /api/v1/emails
    query: Joi.object({
      skip: Joi.number(),
      limit: Joi.number()
        .required()
        .valid(5, 10, 25, 50, 100),
      sort: Joi.object()
        .keys({
          name: Joi.string()
            .trim(),
          createdAt: Joi.string()
            .trim(),
          type: Joi.string()
            .trim(),
          lang: Joi.string()
            .trim(),
          mailer: Joi.string()
            .trim(),
        }),
      type: Joi.string()
        .valid('email', 'sms'),
      lang: Joi.string()
        .valid(...localizationList),
      name: Joi.string()
        .trim(),
      user: Joi.string()
        .trim(),
      mailer: Joi.string()
        .trim()
    }),
    params: Joi.object({
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

function show(Joi) {
  return {
    // GET Show - /api/v1/emails/:id
    params: Joi.object({
      id: Joi.objectId()
        .required(),
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

function destroy(Joi) {
  return {
    // DELETE Destroy - /api/v1/emails/:id
    params: Joi.object({
      id: Joi.objectId()
        .required(),
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

export default { list, show, destroy };
