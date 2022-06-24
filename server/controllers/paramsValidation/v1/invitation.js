// POST Create invite to Survey - /api/v1/invitation
function create(Joi) {
  return {
    body: Joi.object({
      survey: Joi.objectId()
        .required()
    })
  };
}

export default { create };
