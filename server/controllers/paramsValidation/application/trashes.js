// constants
import { relationTypes } from '../../../models/Trash';
import { questionTypes } from '../../../models/Question';

// GET List - /api/v1/trash
function list(Joi) {
  return {
    query: Joi.object({
      destroy: Joi.boolean(),
      createdAt: Joi.object()
        .keys({
          from: Joi.date(),
          to: Joi.date()
        }),
      updatedAt: Joi.object()
        .keys({
          $eq: Joi.date(),
          $lte: Joi.date(),
          $gte: Joi.date()
        }),
      createdBy: Joi.string()
        .trim(),
      updatedBy: Joi.string()
        .trim(),
      expireDate: Joi.object()
        .keys({
          from: Joi.date(),
          to: Joi.date()
        }),
      surveyName: Joi.string()
        .trim(),
      questionName: Joi.string()
        .trim(),
      surveyType: Joi.alternatives([
        Joi.string()
          .valid('survey', 'quiz', 'pulse')
          .trim(),
        Joi.array()
          .items(Joi.string()
            .valid('survey', 'quiz', 'pulse')
            .trim())
      ]),
      questionTypes: Joi.alternatives([
        Joi.array().items(Joi.string()
          .valid(...questionTypes)),
        Joi.string()
          .valid(...questionTypes)
      ]),
      inputTypes: Joi.alternatives([
        Joi.array().items(Joi.string()
          .valid('number', 'phone', 'email')),
        Joi.string()
          .valid('number', 'phone', 'email')
      ]),
      skip: Joi.number(),
      limit: Joi.number()
        .required()
        .valid(5, 10, 25, 50, 100),
      sort: Joi.object()
        .keys({
          createdAt: Joi.string()
            .trim(),
          expireDate: Joi.string()
            .trim(),
        }),
      type: Joi.string()
        .valid(relationTypes)
    }),
    params: Joi.object({
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

// DELETE Destroy - /api/v1/trash/:id
function destroy(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required(),
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

export default {
  list,
  destroy
};
