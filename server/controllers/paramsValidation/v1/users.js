// localization helpers
import { localizationList } from '../../../../config/localization';

const userSchema = Joi => Joi.object({
  avatar: Joi.alternatives([
    Joi.object().allow(null), // allow remove logo
    Joi.string()
  ]),
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
  userTeams: Joi.array()
    .items(
      Joi.objectId()
        .required()
    ),
  email: Joi.string()
    .trim()
    .required(),
  phoneNumber: Joi.string()
    .allow('')
    .trim(),
  address: Joi.object()
    .keys({
      street: Joi.string()
        .allow('')
        .trim(),
      city: Joi.string()
        .allow('')
        .trim(),
      zipCode: Joi.string()
        .allow('')
        .trim(),
      country: Joi.string()
        .allow('')
        .trim()
    }),
  password: Joi.string()
    .trim()
    .required()
    .min(8)
    .max(15),
  defaultLanguage: Joi.string()
    .valid(...localizationList)
    .required(),
  isPowerUser: Joi.boolean(),
  items: Joi.object()
    .keys({
      teams: Joi.array()
        .items(
          Joi.objectId()
        )
    })
});

// POST Create users - /api/v1/users
function create(Joi) {
  return {
    body: userSchema(Joi)
  };
}

// PUT Update users - /api/v1/users/:id
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
      userTeams: Joi.array()
        .items(
          Joi.objectId()
            .required()
        ),
      email: Joi.string()
        .trim(),
      phoneNumber: Joi.string()
        .allow('')
        .trim(),
      password: Joi.string()
        .trim()
        .min(8)
        .max(15),
      confirmPassword: Joi.string()
        .trim()
        .min(8)
        .max(15)
    }),
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

// DELETE user - /api/v1/users/:id
function destroy(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

export default { create, update, destroy };
