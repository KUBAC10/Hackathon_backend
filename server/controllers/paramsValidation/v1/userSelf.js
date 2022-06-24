// localization helpers
import { localizationList } from '../../../../config/localization';

// PUT SetCurrentTeam - /api/v1/user-self
function setCurrentTeam(Joi) {
  return {
    body: Joi.object({
      team: Joi.objectId()
        .required()
    })
  };
}

// PUT Update - /api/v1/user-self/update
function update(Joi) {
  return {
    body: Joi.object({
      avatar: Joi.alternatives([
        Joi.object().allow(null), // allow remove logo
        Joi.string()
      ]),
      name: Joi.object()
        .keys({
          first: Joi.string()
            .trim(),
          last: Joi.string()
            .trim()
        }),
      phoneNumber: Joi.string()
        .trim()
        .allow(''),
      email: Joi.string()
        .trim(),
      defaultLanguage: Joi.string()
        .valid(...localizationList),
      address: Joi.object()
        .keys({
          street: Joi.string()
            .trim()
            .allow(''),
          city: Joi.string()
            .trim()
            .allow(''),
          zipCode: Joi.string()
            .trim()
            .allow(''),
          country: Joi.string()
            .trim()
            .allow('')
        })
    })
  };
}

// POST setTableColumnSettings - /api/v1/user-self/table-column-settings
function setTableColumnSettings(Joi) {
  return {
    body: Joi.object({
      users: Joi.object()
        .keys({
          name: Joi.boolean(),
          email: Joi.boolean(),
          phoneNumber: Joi.boolean(),
          address: Joi.object()
            .keys({
              street: Joi.boolean(),
              zipCode: Joi.boolean(),
              city: Joi.boolean(),
              country: Joi.boolean()
            }),
          defaultLanguage: Joi.boolean(),
          createdAt: Joi.boolean(),
          updatedAt: Joi.boolean(),
          createdBy: Joi.boolean(),
          updatedBy: Joi.boolean()
        }),
      contacts: Joi.object()
        .keys({
          name: Joi.boolean(),
          email: Joi.boolean(),
          tagEntities: Joi.boolean(),
          phoneNumber: Joi.boolean(),
          createdAt: Joi.boolean(),
          updatedAt: Joi.boolean(),
          createdBy: Joi.boolean(),
          updatedBy: Joi.boolean()
        }),
      questions: Joi.object()
        .keys({
          name: Joi.boolean(),
          type: Joi.boolean(),
          general: Joi.boolean(),
          trend: Joi.boolean(),
          description: Joi.boolean(),
          createdAt: Joi.boolean(),
          updatedAt: Joi.boolean(),
          createdBy: Joi.boolean(),
          updatedBy: Joi.boolean()
        }),
      tags: Joi.object()
        .keys({
          name: Joi.boolean(),
          description: Joi.boolean(),
          createdAt: Joi.boolean(),
          updatedAt: Joi.boolean(),
          createdBy: Joi.boolean(),
          updatedBy: Joi.boolean()
        }),
      teams: Joi.object()
        .keys({
          name: Joi.boolean(),
          description: Joi.boolean(),
          createdAt: Joi.boolean(),
          updatedAt: Joi.boolean(),
          createdBy: Joi.boolean(),
          updatedBy: Joi.boolean()
        }),
      surveys: Joi.object()
        .keys({
          name: Joi.boolean(),
          team: Joi.boolean(),
          description: Joi.boolean(),
          active: Joi.boolean(),
          publicAccess: Joi.boolean(),
          startDate: Joi.boolean(),
          totalInvites: Joi.boolean(),
          surveyType: Joi.boolean(),
          totalCompleted: Joi.boolean(),
          completedPercentage: Joi.boolean(),
          lastAnswerDate: Joi.boolean(),
          endDate: Joi.boolean(),
          urlName: Joi.boolean(),
          createdAt: Joi.boolean(),
          updatedAt: Joi.boolean(),
          createdBy: Joi.boolean(),
          updatedBy: Joi.boolean()
        }),
      mailers: Joi.object()
        .keys({
          name: Joi.boolean(),
          subject: Joi.boolean(),
          globalMailer: Joi.object()
            .keys({
              description: Joi.boolean(),
              templateVariables: Joi.boolean()
            }),
          createdAt: Joi.boolean(),
          updatedAt: Joi.boolean(),
          createdBy: Joi.boolean(),
          updatedBy: Joi.boolean()
        }),
      emails: Joi.object()
        .keys({
          name: Joi.boolean(),
          type: Joi.boolean(),
          mailer: Joi.boolean(),
          lang: Joi.boolean(),
          user: Joi.boolean(),
          createdAt: Joi.boolean(),
          updatedAt: Joi.boolean(),
          createdBy: Joi.boolean(),
          updatedBy: Joi.boolean()
        }),
      assets: Joi.object()
        .keys({
          name: Joi.boolean(),
          type: Joi.boolean(),
          description: Joi.boolean(),
          createdAt: Joi.boolean(),
          updatedAt: Joi.boolean(),
          createdBy: Joi.boolean(),
          updatedBy: Joi.boolean()
        }),
      templates: Joi.object()
        .keys({
          name: Joi.boolean(),
          description: Joi.boolean(),
          createdAt: Joi.boolean(),
          updatedAt: Joi.boolean(),
          createdBy: Joi.boolean(),
          updatedBy: Joi.boolean()
        }),
      trash: Joi.object()
        .keys({
          _id: Joi.boolean(),
          createdAt: Joi.boolean(),
          expireDate: Joi.boolean(),
          createdBy: Joi.boolean()
        }),
      surveyResults: Joi.object()
        .keys({
          step: Joi.boolean(),
          token: Joi.boolean(),
          contact: Joi.boolean(),
          completed: Joi.boolean(),
          preview: Joi.boolean(),
          startedAt: Joi.boolean(),
          location: Joi.boolean(),
          createdAt: Joi.boolean()
        })
    })
  };
}

// POST Set Password - /api/v1/user-self/update-password
function updatePassword(Joi) {
  return {
    body: Joi.object({
      oldPassword: Joi.string()
        .trim()
        .required()
        .min(8)
        .max(15),
      password: Joi.string()
        .trim()
        .required()
        .min(8)
        .max(15),
      confirmPassword: Joi.string()
        .trim()
        .required()
        .min(8)
        .max(15)
    })
  };
}

// POST Reset Password - /api/v1/users/self/reset-password
function resetPassword(Joi) {
  return {
    body: Joi.object({
      email: Joi.string()
        .trim()
        .required()
    })
  };
}

// POST Set Password - /api/v1/users/self/set-password
function setPassword(Joi) {
  return {
    body: Joi.object({
      resetToken: Joi.string()
        .trim(),
      password: Joi.string()
        .trim()
        .required()
        .min(8)
        .max(15),
      confirmPassword: Joi.string()
        .trim()
        .required()
        .min(8)
        .max(15)
    })
  };
}

export default {
  setCurrentTeam,
  setTableColumnSettings,
  update,
  updatePassword,
  resetPassword,
  setPassword
};
