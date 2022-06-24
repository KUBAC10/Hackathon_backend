// POST /api/v1/dashboards - create new dashboard
function create(Joi) {
  return {
    body: Joi.object({
      name: Joi.string()
    })
  };
}

// GET /api/v1/dashboards - get list of dashboards
function list(Joi) {
  return {
    query: Joi.object({
      skip: Joi.number(),
      limit: Joi.number()
    })
  };
}

// GET /api/v1/dashboards/:id - show dashboard
function show(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

// PUT /api/v1/dashboards/:id - update dashboard
function update(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    body: Joi.object({
      name: Joi.string(),
      description: Joi.string()
    })
  };
}

// DELETE /api/v1/dashboards/:id - delete dashboard
function destroy(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

// // GET /api/v1/dashboard/
// function list(Joi) {
//   return {
//     query: Joi.object({
//       type: Joi.string()
//         .valid('question', 'survey')
//         .required()
//     })
//   };
// }
//
// // POST /api/v1/dashboard/items
// function items(Joi) {
//   return {
//     body: Joi.object({
//       type: Joi.string()
//         .valid('question', 'survey')
//         .required(),
//       items: Joi.array()
//         .max(5)
//         .items(
//           Joi.string()
//         )
//     })
//   };
// }
//
// // POST /api/v1/dashboard/items
// function coordinates(Joi) {
//   return {
//     body: Joi.object({
//       lng: Joi.number()
//         .required()
//         .min(-90)
//         .max(90),
//       lat: Joi.number()
//         .required()
//         .min(-90)
//         .max(90),
//       token: Joi.string(),
//       fingerprintId: Joi.string(),
//       surveyId: Joi.objectId()
//         .required(),
//       surveyResultId: Joi.objectId()
//         .required(),
//     })
//   };
// }

export default {
  create,
  list,
  show,
  update,
  destroy
};
