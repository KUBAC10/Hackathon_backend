import { rangeOptions } from '../../../models/SurveyReport';
import { charts } from '../../../models/SurveyReportItem';

// config
import { localizationList } from '../../../../config/localization';

// GET /api/v1/survey-reports - get list of survey reports
function list(Joi) {
  return {
    query: Joi.object({
      survey: Joi.objectId()
        .required(),
      reportsMailing: Joi.boolean(),
      skip: Joi.number(),
      limit: Joi.number()
        .required()
        .valid(5, 10, 25, 50, 100),
    })
  };
}

// POST /api/v1/survey-reports - create survey report
function create(Joi) {
  return {
    body: Joi.object({
      survey: Joi.objectId()
        .required(),
      reportsMailing: Joi.boolean(),
      emailReportFormat: Joi.object({
        emailTable: Joi.boolean(),
        csv: Joi.boolean(),
        pdf: Joi.boolean()
      })
    })
  };
}

// POST /api/v1/survey-reports/:id/clone - clone survey report
function cloneReport(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

// POST /api/v1/survey-reports/:id/get-text-answers-list - get list of text or custom answers
function getTextAnswersList(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    body: Joi.object({
      type: Joi.string()
        .valid('report', 'segments'),
      field: Joi.string()
        .valid('value', 'customAnswer'),
      surveyItemId: Joi.objectId()
        .required(),
      skip: Joi.number(),
      limit: Joi.number()
    })
  };
}

// PUT /api/v1/survey-reports/:id - update survey report
function update(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    body: Joi.object({
      name: Joi.string(),
      description: Joi.string().allow(''),
      lang: Joi.string().valid(...localizationList),
      logo: Joi.alternatives([
        Joi.object().allow(null),
        Joi.string()
      ]),
      cover: Joi.alternatives([
        Joi.object().allow(null),
        Joi.string()
      ]),
      colors: Joi.array().items(Joi.string()),
      range: Joi.string().valid(...rangeOptions),
      from: Joi.date().allow(null),
      to: Joi.date().allow(null),
      hideCoverPage: Joi.boolean(),
      hideLastPage: Joi.boolean(),
      titleLastPage: Joi.string(),
      textLastPage: Joi.string().allow(''),
      segments: Joi.object({
        surveyReportId: Joi.objectId(),
        surveyItems: Joi.array()
          .items(Joi.objectId()),
        filters: Joi.object({
          assets: Joi.array().items(Joi.objectId()),
          quizCorrect: Joi.object({
            from: Joi.number(),
            to: Joi.number(),
          }),
          quizTotal: Joi.object({
            from: Joi.number(),
            to: Joi.number(),
          }),
          createdAt: Joi.object({
            from: Joi.date(),
            to: Joi.date(),
          }),
        }),
        answers: Joi.array()
          .items(Joi.object({
            surveyItem: Joi.objectId().required(),
            assets: Joi.array().items(Joi.objectId()),
            questionItems: Joi.array().items(Joi.objectId()),
            gridRow: Joi.objectId(),
            gridColumn: Joi.objectId(),
            value: Joi.alternatives([
              Joi.string(),
              Joi.array().items(Joi.number()),
              Joi.array().items(Joi.string())
            ]),
            customAnswer: Joi.string(),
            country: Joi.alternatives([
              Joi.objectId(),
              Joi.array().items(Joi.objectId())
            ]),
            crossings: Joi.array().items(Joi.object({
              gridRow: Joi.objectId().required(),
              gridColumn: Joi.objectId().required()
            }))
          }))
      }),
      groupBySurveyItem: Joi.objectId()
        .allow(null),
      emailReportFormat: Joi.object({
        emailTable: Joi.boolean(),
        csv: Joi.boolean(),
        pdf: Joi.boolean()
      }),
      targets: Joi.array().items(Joi.objectId()),
      drivers: Joi.array().items(Joi.objectId()),
      tags: Joi.array().items(Joi.objectId())
    })
  };
}

// DELETE Destroy - /api/v1/survey-reports/:id
function destroy(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

// GET /api/v1/survey-reports/data - get report data
function data(Joi) {
  return {
    query: Joi.object({
      survey: Joi.objectId().required(),
      reportId: Joi.objectId(),
      surveyItemId: Joi.objectId()
    })
  };
}

// POST /api/v1/survey-reports/:surveyReport/survey-item/:surveyItem
function updateItem(Joi) {
  return {
    params: Joi.object({
      surveyReport: Joi.objectId()
        .required(),
      surveyItem: Joi.objectId()
        .required()
    }),
    body: Joi.object({
      descriptionShow: Joi.boolean(),
      description: Joi.string(),
      chart: Joi.string()
        .valid(...charts),
      hide: Joi.boolean(),
      hideItems: Joi.array()
        .items(Joi.string()),
      colors: Joi.array()
        .items(Joi.string()),
      type: Joi.string()
        .valid('surveyReport', 'segments')
        .required(),
      skip: Joi.number(),
      limit: Joi.number(),
      params: Joi.object({
        from: Joi.date(),
        to: Joi.date(),
        value: Joi.alternatives([
          Joi.array().items(Joi.number()),
          Joi.number()
        ]),
        sort: Joi.string()
          .valid('asc', 'desc')
      }),
      textLastPage: Joi.string().allow('')
    })
  };
}

export default {
  list,
  create,
  update,
  getTextAnswersList,
  cloneReport,
  destroy,
  data,
  updateItem,
};
