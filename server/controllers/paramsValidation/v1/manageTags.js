// PUT update - /api/v1/manage-tags/:type/:id
function updateEntity(Joi) {
  return {
    body: Joi.object({
      items: Joi.array()
        .items(
          Joi.objectId()
        )
        .required()
    }),
    params: Joi.object({
      id: Joi.objectId()
        .required(),
      type: Joi.string()
        .valid('contact', 'question', 'template', 'survey')
        .required()
    })
  };
}

export default { updateEntity };
