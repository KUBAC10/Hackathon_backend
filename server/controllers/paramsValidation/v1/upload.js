/** POST /api/v1/uploads/surveys/:id/logo */
function uploadSurveyLogo(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

export default { uploadSurveyLogo };
