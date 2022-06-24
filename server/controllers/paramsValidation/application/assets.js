import { assetsSchema } from '../v1/assets';

const validTypes = ['location', 'product'];

// POST Create - /api/v1/assets
function create(Joi) {
  return {
    body: assetsSchema(Joi),
    params: Joi.object({
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

// PUT Update - /api/v1/assets/:id
function update(Joi) {
  return {
    body: assetsSchema(Joi),
    params: Joi.object({
      id: Joi.objectId()
        .required(),
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

// GET List - /api/v1/assets
function list(Joi) {
  return {
    query: Joi.object({
      name: Joi.string()
        .trim(),
      createdAt: Joi.object()
        .keys({
          $eq: Joi.date(),
          $lte: Joi.date(),
          $gte: Joi.date()
        }),
      updatedAt: Joi.object()
        .keys({
          $eq: Joi.date(),
          $lte: Joi.date(),
          $gte: Joi.date()
        }),
      createdBy: Joi.string()
        .trim(),
      updatedBy: Joi.string()
        .trim(),
      skip: Joi.number(),
      limit: Joi.number()
        .required()
        .valid(5, 10, 25, 50, 100),
      type: Joi.string()
        .trim()
        .valid(...validTypes),
      sort: Joi.object()
        .keys({
          createdAt: Joi.string()
            .trim(),
          updatedAt: Joi.string()
            .trim(),
          name: Joi.string()
            .trim(),
          type: Joi.string()
            .trim(),
        }),
    }),
    params: Joi.object({
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

// GET Show - /api/v1/assets/:id
function show(Joi) {
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

// DELETE Destroy - /api/v1/assets/:id
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

export default {
  list,
  show,
  create,
  update,
  destroy
};
