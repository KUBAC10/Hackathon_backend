// DELETE Destroy - /api/v1/teams/:id
function destroy (Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

function addTeamUsers(Joi) {
  return {
    body: Joi.object({
      users: Joi.array()
        .items(
          Joi.objectId()
        ),
    })
  };
}

export default {
  destroy,
  addTeamUsers
};
