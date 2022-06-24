import { localizationList } from '../../../../config/localization';

// POST Create survey from template - /api/v1/templates/clone/:id
function clone(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .trim()
        .required()
    }),
    body: Joi.object({
      type: Joi.string().required().valid('survey', 'template'),
      defaultLanguage: Joi.string().valid(...localizationList)
    })
  };
}

export default { clone };
