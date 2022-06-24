function addContacts(Joi) {
  return {
    body: Joi.object({
      contacts: Joi.array()
        .items(
          Joi.objectId()
        ),
    })
  };
}

/** GET /api/v1/tags/by-survey - return list of tags  */
function tagsBySurvey(Joi) {
  return {
    query: Joi.object({
      survey: Joi.objectId()
        .required()
    })
  };
}

export default {
  addContacts,
  tagsBySurvey
};
