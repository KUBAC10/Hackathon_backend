// POST Create - /api/v1/team-users
function create(Joi) {
  return {
    body: Joi.object({
      user: Joi.string()
        .trim()
        .required(),
      team: Joi.string()
        .trim()
        .required(),
    }),
    params: Joi.object({
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

// DELETE Destroy - /api/v1/team-users/:id
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
