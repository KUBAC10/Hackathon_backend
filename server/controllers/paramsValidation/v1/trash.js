/** POST /api/v1/trash/clear - clear trash items by ids */
function clear(Joi) {
  return {
    body: Joi.object({
      ids: Joi.array()
        .items(
          Joi.objectId()
            .required()
        ),
    })
  };
}

/** POST /api/v1/trash/:id/restore - restore trash item */
function restore(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

/** GET /api/v1/trash/drafts/:id - list of draft trashes */
function draftTrash(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId().required()
    }),
    query: Joi.object({
      stage: Joi.string()
        .valid('initial', 'inDraft')
        .required(),
      skip: Joi.number(),
      limit: Joi.number()
        .valid(5, 10, 25, 50, 100)
        .required(),
    })
  };
}

export default {
  clear,
  restore,
  draftTrash
};
