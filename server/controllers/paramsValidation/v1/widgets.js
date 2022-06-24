// const options
import { widgetRangeTypes, widgetTypes } from '../../../models/Widget';

// GET /api/v1/widgets/categories/:id
function showCategory(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

// POST /api/v1/widgets - create widget
function create(Joi) {
  return {
    body: Joi.object({
      dashboardId: Joi.objectId()
        .required(),
      type: Joi.string()
        .valid(...widgetTypes)
        .required(),
      size: Joi.number(),
      chart: Joi.boolean(),
      dynamics: Joi.boolean(),
      lists: Joi.boolean(),
      completion: Joi.boolean(),
      response: Joi.boolean(),
      overallEngagementScore: Joi.boolean(),
      topFive: Joi.boolean(),
      withSubDrivers: Joi.boolean()
    })
  };
}

// PUT /api/v1/widgets/:id - update widget
function update(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    body: Joi.object({
      name: Joi.string().allow(''),
      color: Joi.string(),
      from: Joi.date(),
      to: Joi.date(),
      surveys: Joi.array().items(Joi.objectId()),
      questions: Joi.array().items(Joi.objectId()),
      surveyCampaigns: Joi.array().items(Joi.objectId()),
      contacts: Joi.array().items(Joi.objectId()),
      tags: Joi.array().items(Joi.objectId()),
      languages: Joi.array().items(Joi.string()),
      countries: Joi.array().items(Joi.string()),
      rangeType: Joi.string().valid(...widgetRangeTypes)
    })
  };
}

// DELETE /api/v1/widgets/:id - remove widget
function destroy(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

// GET /api/v1/widgets/:id - get widget data
function data(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

export default {
  showCategory,
  create,
  update,
  destroy,
  data
};
