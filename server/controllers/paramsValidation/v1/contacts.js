// POST Create - /api/v1/contact-us
function importCSV(Joi) {
  return {
    body: Joi.object({
      tags: Joi.alternatives([
        Joi.array().items(Joi.objectId()),
        Joi.objectId()
      ]),
      distributeId: Joi.objectId()
    })
  };
}

export default { importCSV };
