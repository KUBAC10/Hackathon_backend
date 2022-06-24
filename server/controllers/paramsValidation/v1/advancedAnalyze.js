/** GET /api/v1/advanced-analyze/surveys/:id/replies - get analytic by survey responses */
function replies(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    query: Joi.object({
      from: Joi.date().allow(null),
      to: Joi.date().allow(null),
      targets: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      ),
      campaigns: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      ),
      tags: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      )
    })
      .and('from', 'to')
  };
}

/** GET /api/v1/advanced-analyze/surveys/:id/locations - get location analytic  */
function locations(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    query: Joi.object({
      from: Joi.date().allow(null),
      to: Joi.date().allow(null),
      targets: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      ),
      campaigns: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      ),
      tags: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      )
    })
      .and('from', 'to')
  };
}

/** GET /api/v1/advanced-analyze/surveys/:id/devices - get devices analytic  */
function devices(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    query: Joi.object({
      from: Joi.date().allow(null),
      to: Joi.date().allow(null),
      targets: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      ),
      campaigns: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      ),
      tags: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      )
    })
      .and('from', 'to')
  };
}

/** GET /api/v1/advanced-analyze/surveys/:id/nps-statistic - nps questions statistic */
function npsStatistic(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    query: Joi.object({
      from: Joi.date().allow(null),
      to: Joi.date().allow(null),
      roundId: Joi.objectId(),
      targets: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      ),
      campaigns: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      ),
      tags: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      ),
      surveyItems: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      )
    })
      .and('from', 'to'),
  };
}

/** GET /api/v1/advanced-analyze/surveys/:id/nps-comments - net promoter score comments */
function npsComments(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    query: Joi.object({
      from: Joi.date().allow(null),
      to: Joi.date().allow(null),
      roundId: Joi.objectId(),
      targets: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      ),
      campaigns: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      ),
      tags: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      ),
      surveyItems: Joi.alternatives([
        Joi.array().items(Joi.objectId()),
        Joi.objectId()
      ]),
      question: Joi.objectId(),
      value: Joi.alternatives([
        Joi.array().items(Joi.number()),
        Joi.number()
      ]),
      skip: Joi.number(),
      limit: Joi.number(),
      sort: Joi.string()
        .valid('asc', 'desc')
    })
  };
}

/** GET /api/v1/advanced-analyze/surveys/:id/dependency - calculate correlation coefficients */
function dependency(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    query: Joi.object({
      from: Joi.date().allow(null),
      to: Joi.date().allow(null),
      targets: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      ),
      campaigns: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      ),
      tags: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      ),
      correlationDirection: Joi.string()
        .valid('positive', 'negative')
    })
  };
}

/** GET /api/v1/advanced-analyze/surveys/:id/insights - return analytic notifications */
function insights(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    query: Joi.object({
      skip: Joi.number(),
      limit: Joi.number()
    })
  };
}

// GET /api/v1/advanced-analyze/:surveyId/driver/:pulseSurveyDriverId
function driverReport(Joi) {
  return {
    params: Joi.object({
      surveyId: Joi.objectId().required(),
      pulseSurveyDriverId: Joi.objectId().required(),
    }),
    query: Joi.object({
      roundId: Joi.objectId(),
      tags: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      )
    })
  };
}

/** GET /api/v1/advanced-analyze/surveys/:id/pulse-summary - pulse summary */
function pulseSummary(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
    }),
    query: Joi.object({
      roundId: Joi.objectId(),
      tags: Joi.alternatives(
        Joi.array()
          .items(Joi.objectId()),
        Joi.objectId()
      )
    })
  };
}

/** GET /api/v1/advanced-analyze/surveys/:id/pulse-drivers - return list of survey pulse drivers */
function getPulseSurveyDrivers(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
    })
  };
}

export default {
  replies,
  locations,
  devices,
  npsStatistic,
  npsComments,
  dependency,
  insights,
  driverReport,
  pulseSummary,
  getPulseSurveyDrivers
};
