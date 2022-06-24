import _ from 'lodash';

import { CompanyLimitation } from '../models';

// check limit on pre save
async function checkLimit(doc) {
  try {
    const { company } = doc;
    const key = _getLimitKey(doc.schema.options.collection);

    if (!key) return;

    // load company limitation doc
    const limit = await CompanyLimitation.model
      .findOne({ company, [key]: { $exists: true } })
      .select(key === 'responses' ? `${key} responsesHide` : key)
      .lean();

    if (!limit) return;

    // throw custom error if the limit was exceeded
    if (limit[key] <= 0) {
      return Promise.reject({
        name: 'CompanyLimitExceeded',
        message: `Company exceeded monthly limit of ${_.lowerCase(key)}`
      });
    }

    doc._limit = {
      query: { _id: limit._id },
      update: { $inc: { [key]: -1 } }
    };

    if (key === 'responses') doc._limit.responsesHide = limit.responsesHide;
  } catch (e) {
    return Promise.reject(e);
  }
}

// handle responses limit with answer
async function handleNotEmptyResponses(doc) {
  try {
    let limit = doc._limit;

    if (!limit) {
      limit = await CompanyLimitation.model
        .findOne({ company: doc.company, responsesHide: { $exists: true } })
        .select('responsesHide')
        .lean();
    }

    if (!limit) return;

    if (limit.responsesHide <= 0) {
      doc.hide = true;

      return;
    }

    if (!doc._limit) doc._limit = { query: { _id: limit._id }, update: { $inc: {} } };

    doc._limit.update.$inc.responsesHide = -1;
  } catch (e) {
    return Promise.reject(e);
  }
}

// decrement limit on post save
async function handleLimit({ query, update }) {
  try {
    await CompanyLimitation.model.updateOne(query, update);
  } catch (e) {
    return Promise.reject(e);
  }
}

// return key of limit by collection
function _getLimitKey(collection) {
  switch (collection) {
    case 'Survey': return 'surveys';
    case 'SurveyResult': return 'responses';
    case 'SurveySection': return 'surveySections';
    case 'Question': return 'questions';
    case 'QuestionItem': return 'questionItems';
    case 'GridRow': return 'gridRows';
    case 'GridColumn': return 'gridColumns';
    case 'FlowLogic': return 'flowLogic';
    case 'FlowItem': return 'flowItems';
    case 'ContentItem': return 'contentItems';
    case 'SurveyReport': return 'surveyReports';
    case 'SurveyReportItem': return 'surveyReportItems';
    case 'SurveyCampaign': return 'surveyCampaigns';
    case 'SurveyTheme': return 'surveyThemes';
    case 'Mailer': return 'mailers';
    case 'Invite': return 'invites';
    default: return;
  }
}

export default {
  checkLimit,
  handleLimit,
  handleNotEmptyResponses
};
