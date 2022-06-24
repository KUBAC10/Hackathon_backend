// POST Create - /api/v1/tag-entities
function create(Joi) {
  return {
    body: Joi.object({
      tag: Joi.string()
        .required()
        .trim(),
      contact: Joi.string()
        .trim(),
    }),
    params: Joi.object({
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

// DELETE Destroy - /api/v1/tag-entities/:id
function destroy(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required(),
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

export default { create, destroy };
