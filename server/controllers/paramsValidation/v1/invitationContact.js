// localization helpers
import { localizationList } from '../../../../config/localization';

// POST Invite contact to Survey - /api/v1/invitation-contact
function invite(Joi) {
  return {
    body: Joi.object({
      survey: Joi.objectId()
        .required(),
      contactIds: Joi.array()
        .items(
          Joi.objectId()
        ),
      tagIds: Joi.array()
        .items(
          Joi.objectId()
        ),
      lang: Joi.string()
        .valid(...localizationList)
    })
  };
}

// POST /api/v1/invitation-contact/count - Get count of invites by contacts and tags
function count(Joi) {
  return {
    body: Joi.object({
      contactIds: Joi.array()
        .items(
          Joi.objectId()
        ),
      tagIds: Joi.array()
        .items(
          Joi.objectId()
        )
    })
  };
}

// POST Invite by emails - /api/v1/invitation-contact/by-emails
function byEmails(Joi) {
  return {
    body: Joi.object({
      token: Joi.string(),
      emails: Joi.array()
        .items(
          Joi.string()
            .required()
        ),
      surveyId: Joi.objectId()
        .required(),
      type: Joi.string()
        .required()
        .valid('public', 'preview'),
      lang: Joi.string()
        .valid(...localizationList)
    })
  };
}

export default { byEmails, invite, count };
