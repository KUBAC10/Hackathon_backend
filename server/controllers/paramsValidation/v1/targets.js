
// GET /api/v1/distribute/targets - return list of targets
function list(Joi) {
  return {
    query: Joi.object({
      survey: Joi.objectId()
        .required(),
      skip: Joi.number(),
      limit: Joi.number().valid(5, 10, 25, 50, 100, 1000),
    })
  };
}

// POST /api/v1/distribute/targets - create target
function create(Joi) {
  return {
    body: Joi.object({
      survey: Joi.objectId()
        .required(),
      name: Joi.string()
        .required()
    })
  };
}

// PUT /api/v1/targets/:id - update target
function update(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    body: Joi.object({
      name: Joi.string(),
      token: Joi.string()
    })
  };
}

// DELETE /api/v1/targets/:id - remove target
function destroy(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

export default {
  list,
  create,
  update,
  destroy
};
