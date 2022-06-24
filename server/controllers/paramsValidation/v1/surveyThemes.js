import { fonts } from '../../../models/SurveyTheme';

const surveyThemeSchema = Joi => Joi.object({
  name: Joi.string(),
  primaryColor: Joi.string(),
  bgColor: Joi.string(),
  sectionStyle: Joi.string().valid('light', 'neutral', 'dark'),
  questionStyle: Joi.string().valid('light', 'dark'),
  bgImgType: Joi.string().valid('cloudinary', 'unsplash', 'none'),
  bgOpacity: Joi.number()
    .integer()
    .positive()
    .max(100)
    .allow(0),
  progressBar: Joi.boolean(),
  questionNumbers: Joi.boolean(),
  font: Joi.string().valid(fonts),
  logo: Joi.alternatives([
    Joi.object().allow(null), // allow remove logo
    Joi.string()
  ])
})
  .when(Joi.object({ bgImgType: 'cloudinary' }), {
    then: Joi.object({
      bgImgCloudinary: Joi.alternatives([
        Joi.object().required(),
        Joi.string().required()
      ]),
    })
  })
  .when(Joi.object({ bgImgType: 'unsplash' }), {
    then: Joi.object({
      bgImgUrl: Joi.string().required()
    })
  });

/** GET /api/v1/survey-themes - get list of themes */
function list(Joi) {
  return {
    query: Joi.object({
      name: Joi.string()
        .trim(),
      skip: Joi.number(),
      limit: Joi.number()
        .required()
        .valid(5, 10, 25, 50, 100),
      own: Joi.boolean()
    })
  };
}

/** GET /api/v1/survey-themes/:id - get theme */
function show(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId().required()
    })
  };
}

/** POST /api/v1/survey-themes - create user theme */
function create(Joi) {
  return {
    body: surveyThemeSchema(Joi)
  };
}

/** PUT /api/v1/survey-themes/:id - update theme */
function update(Joi) {
  return {
    body: surveyThemeSchema(Joi)
  };
}

/** DELETE /api/v1/survey-themes/:id - delete theme */
function destroy(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId().required()
    })
  };
}

export default {
  list,
  show,
  create,
  update,
  destroy
};
