import { webhookTypes } from '../../../models/Webhook';

const webhookSchema = Joi => ({
  type: Joi.string()
    .required()
    .valid(...webhookTypes),
  url: Joi.string()
    .required()
});

// GET list - /api/v2/webhooks
function list(Joi) {
  return {
    query: Joi.object({
      skip: Joi.number(),
      limit: Joi.number()
        .required()
        .valid(5, 10, 25, 50, 100),
      sort: Joi.object()
        .keys({
          createdAt: Joi.string()
            .trim(),
          updatedAt: Joi.string()
            .trim()
        }),
    })
  };
}

// POST create - /api/v2/webhooks
function create(Joi) {
  return {
    body: Joi.object(webhookSchema(Joi))
  };
}

// GET show - /api/v2/webhooks/:id
function show(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

// PUT update - /api/v2/webhooks/:id
function update(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    body: Joi.object(webhookSchema(Joi))
  };
}

// DELETE destroy /api/v2/webhooks/:id
function destroy(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required(),
    })
  };
}

export default {
  list,
  show,
  destroy,
  update,
  create
};
