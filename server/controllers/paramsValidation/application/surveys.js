import { localizationList } from '../../../../config/localization';

// GET List - /api/v1/surveys
function list(Joi) {
  return {
    query: Joi.object({
      name: Joi.string()
        .trim(),
      language: Joi.array()
        .items(Joi.string().valid(...localizationList)),
      tagName: Joi.string()
        .trim(),
      categories: Joi.alternatives([
        Joi.array().items(Joi.objectId()),
        Joi.objectId()
      ]),
      type: Joi.string()
        .valid('survey', 'template')
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
      publicAccess: Joi.boolean(),
      active: Joi.boolean(),
      inDraft: Joi.boolean(),
      urlName: Joi.string()
        .trim(),
      totalCompleted: Joi.object()
        .keys({
          $eq: Joi.number(),
          $lte: Joi.number(),
          $gte: Joi.number()
        }),
      createdBy: Joi.string()
        .trim(),
      updatedBy: Joi.string()
        .trim(),
      skip: Joi.number(),
      inCurrentTeam: Joi.boolean(),
      notPublic: Joi.boolean(),
      limit: Joi.number()
        .required()
        .valid(5, 10, 25, 50, 100, 1000),
      sort: Joi.object()
        .keys({
          createdAt: Joi.string()
            .trim(),
          name: Joi.string()
            .trim(),
          type: Joi.string()
            .trim(),
          surveyType: Joi.string()
            .trim(),
          publicAccess: Joi.string()
            .trim(),
          active: Joi.string()
            .trim(),
          totalCompleted: Joi.string()
            .trim(),
          lastAnswerDate: Joi.string()
            .trim(),
          updatedAt: Joi.string()
            .trim(),
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

// GET Show - /api/v1/surveys/:id
function show(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required(),
      list: Joi.string()
        .trim()
        .required()
    }),
    query: Joi.object({
      type: Joi.string()
        .valid(['template', 'survey'])
    })
  };
}

// PUT Update - /api/v1/surveys/:id
function update(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required(),
      list: Joi.string()
        .trim()
        .required()
    }),
    body: Joi.object({
      active: Joi.boolean()
        .required()
    })
  };
}

export default { list, show, update };
