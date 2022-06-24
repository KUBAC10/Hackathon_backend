import { questionTypes } from '../../../models/Question';

// GET List - /api/v1/questions
function list(Joi) {
  return {
    query: Joi.object({
      name: Joi.string()
        .trim(),
      language: Joi.string()
        .trim(),
      trend: Joi.boolean(),
      general: Joi.boolean(),
      isGlobal: Joi.boolean(),
      inCurrentTeam: Joi.boolean(),
      trendQuestion: Joi.boolean(),
      type: Joi.array()
        .items(Joi.string()
          .valid(...questionTypes)
          .trim()),
      questionTypes: Joi.alternatives([
        Joi.array().items(Joi.string()
          .valid(...questionTypes)),
        Joi.string()
          .valid(...questionTypes)
      ]),
      inputTypes: Joi.alternatives([
        Joi.array().items(Joi.string()
          .valid('number', 'phone', 'email', 'date')),
        Joi.string()
          .valid('number', 'phone', 'email', 'date')
      ]),
      tagName: Joi.string()
        .trim(),
      createdAt: Joi.object()
        .keys({
          $eq: Joi.date(),
          $lte: Joi.date(),
          $gte: Joi.date()
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
      skip: Joi.number(),
      limit: Joi.number()
        .required()
        .valid(5, 10, 25, 50, 100, 1000),
      sort: Joi.object()
        .keys({
          createdAt: Joi.string()
            .trim(),
          updatedAt: Joi.string()
            .trim(),
          type: Joi.string()
            .trim(),
          team: Joi.string()
            .trim(),
          name: Joi.string()
            .trim(),
          general: Joi.string()
            .valid(['asc', 'desc']),
          trend: Joi.string()
            .valid(['asc', 'desc']),
          description: Joi.string()
            .valid(['asc', 'desc'])
        }),
    }),
    params: Joi.object({
      list: Joi.string()
        .trim()
        .required()
    })
  };
}

// GET Show - /api/v1/questions/:id
function show(Joi) {
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

export default { list, show };
