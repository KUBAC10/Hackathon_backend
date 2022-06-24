function removeOne(Joi) {
  return {
    body: Joi.object({
      surveyId: Joi.string()
        .required()
        .trim(),
      meta: Joi.object()
    })
  };
}

function destroy(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required(),
    })
  };
}

function removeArray(Joi) {
  return {
    body: Joi.object({
      idsArray: Joi.array()
        .items(
          Joi.objectId()
            .required()
        ),
    })
  };
}

function removeByMeta(Joi) {
  return {
    body: Joi.object({
      meta: Joi.object()
        .required()
    })
  };
}

export default {
  removeByMeta,
  removeArray,
  removeOne,
  destroy
};
