// localization helpers
import { localizationList } from '../../../../config/localization';

import { industries, sizes } from '../../../models/Company';
import { roles } from '../../../models/User';

// POST Create - /api/v1/registration
function create(Joi) {
  return {
    body: Joi.object({
      companyAttrs: {
        name: Joi.string()
          .trim()
          .required(),
        urlName: Joi.string()
          .trim()
          .required(),
        email: Joi.string()
          .trim()
          .required(),
        address: Joi.object()
          .keys({
            street: Joi.string()
              .trim()
              .required(),
            city: Joi.string()
              .trim()
              .required(),
            zipCode: Joi.string()
              .trim()
              .required(),
            country: Joi.string()
              .trim()
              .required(),
          }),
      },
      teamAttrs: {
        name: Joi.string()
          .trim()
          .required(),
        description: Joi.string()
          .trim()
      },
      userAttrs: {
        name: Joi.object()
          .required()
          .keys({
            first: Joi.string()
              .required()
              .trim(),
            last: Joi.string()
              .required()
              .trim()
          }),
        email: Joi.string()
          .trim()
          .required(),
        phoneNumber: Joi.string()
          .trim(),
        address: Joi.object()
          .keys({
            street: Joi.string()
              .trim()
              .required(),
            city: Joi.string()
              .trim()
              .required(),
            zipCode: Joi.string()
              .trim()
              .required(),
            country: Joi.string()
              .trim()
              .required(),
          }),
        defaultLanguage: Joi.string()
          .valid(...localizationList)
          .required(),
      },
    })
  };
}

// POST Confirm User - /api/v1/registration/confirm/user
function confirmUser(Joi) {
  return {
    body: Joi.object({
      confirmationToken: Joi.string()
        .trim()
        .required(),
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

// POST Confirm Company - /api/v1/registration/confirm/company
function confirmCompany(Joi) {
  return {
    body: Joi.object({
      confirmationToken: Joi.string()
        .trim()
        .required(),
    })
  };
}

// POST Request Company Confirmation Mailer - /api/v1/registration/confirm/request-company
function requestCompany(Joi) {
  return {
    body: Joi.object({
      companyId: Joi.string()
        .trim()
        .required(),
    })
  };
}

/** POST /api/v1/registration/lite */
function lite(Joi) {
  return {
    body: Joi.object({
      firstName: Joi.string()
        .trim()
        .required(),
      lastName: Joi.string()
        .trim()
        .required(),
      email: Joi.string()
        .trim()
        .required(),
      password: Joi.string()
        .trim()
        .required()
    })
  };
}

/** GET /api/v1/registration/confirm/:token */
function confirmEmail(Joi) {
  return {
    params: Joi.object({
      token: Joi.string()
        .trim()
        .required()
    })
  };
}

/** PUT /api/v1/registration/lite  */
function update(Joi) {
  return {
    body: Joi.object({
      size: Joi.string().valid(...sizes),
      industry: Joi.string().valid(...industries),
      role: Joi.string().valid(...roles),
      defaultTags: Joi.array().items(Joi.objectId())
    })
  };
}

export default {
  create,
  confirmUser,
  confirmCompany,
  requestCompany,
  lite,
  confirmEmail,
  update
};
