// DELETE Destroy - /api/v1/survey-items/:id
function destroy (Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

export default { destroy };
