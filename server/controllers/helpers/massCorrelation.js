import moment from 'moment';
import _ from 'lodash';

// models
import {
  SurveyItem,
  SurveyResult
} from '../../models';

// helpers
import pearsonCorrelation from './pearsonCorrelation';

// config
import config from '../../../config/env';

// return all correlations in survey
export default async function massCorrelation(options = {}) {
  try {
    const { survey, from, to, timeZone, targets, campaigns, tags } = options;
    // get accumulator
    const accumulator = await getAccumulator(survey._id);

    // load and collect data
    await collectCorrelationData({
      survey: survey._id,
      accumulator,
      from,
      to,
      timeZone,
      targets,
      campaigns,
      tags
    });

    return filterAccumulator(accumulator);
  } catch (e) {
    return Promise.reject(e);
  }
}

// calculate and filter correlations
export function filterAccumulator(accumulator) {
  // 0.7+ / -0.7+ for answers 10 > results > 100
  // 0.5+ / -0.5+ for answers 100 > results > 300
  // 0.3+ / -0.3+ for answers 300 > results
  return accumulator
    .map(({ left, right, data }) => ({
      left,
      right,
      correlation: pearsonCorrelation(data),
      n: data.n // responses amount
    }))
    .filter(({ n, correlation }) => {
      const absValue = Math.abs(correlation);

      return ((n > 10) && (absValue >= 0.7)) ||
        ((n > 100) && (absValue >= 0.5)) ||
        ((n > 300) && (absValue >= 0.3));
    });
}

// create accumulator with all possible cases and initial values
export async function getAccumulator(survey) {
  try {
    // valid question types for correlation
    const valueTypes = ['linearScale', 'netPromoterScore', 'slider']; // use value for correlation
    const itemTypes = ['multipleChoice', 'checkboxes', 'dropdown', 'thumbs', 'imageChoice']; // each question item as binary value
    const validTypes = [...valueTypes, ...itemTypes];
    const initialValues = { sum1: 0, sum2: 0, sum1sq: 0, sum2sq: 0, pSum: 0, n: 0 };
    const accumulator = [];
    const entities = [];

    // load question/trendQuestion survey items
    const surveyItems = await SurveyItem.model
      .find({
        survey,
        type: { $in: ['question', 'trendQuestion'] },
        inDraft: { $ne: true },
        inTrash: { $ne: true }
      })
      .sort({ createdAt: 1 })
      .select('_id question createdAt')
      .populate({
        path: 'question',
        populate: {
          path: 'questionItems',
          match: {
            inDraft: { $ne: true },
            inTrash: { $ne: true }
          }
        }
      })
      .lean();

    // get distinct entities
    surveyItems
      .filter(({ question }) => question && validTypes.includes(question.type))
      .forEach((surveyItem) => {
        const { question = {} } = surveyItem;
        const { type, questionItems = [] } = question;

        if (valueTypes.includes(type)) {
          entities.push({
            surveyItem: surveyItem._id.toString(),
            question
          });
        }

        // separate question items
        if (itemTypes.includes(type)) {
          questionItems.forEach((questionItem) => {
            entities.push({
              surveyItem: surveyItem._id.toString(),
              questionItem: questionItem._id.toString(),
              question
            });
          });
        }
      });

    // init values for all possible correlation cases
    for (let i = 0; i < entities.length; i += 1) {
      for (let j = i + 1; j < entities.length; j += 1) {
        const left = entities[i];
        const right = entities[j];
        // skip correlation between same survey items
        if (left.surveyItem !== right.surveyItem) {
          accumulator.push({ left, right, data: { ...initialValues } });
        }
      }
    }

    return accumulator;
  } catch (e) {
    return Promise.reject(e);
  }
}

// load survey results and collect data in presented accumulator value
export async function collectCorrelationData(options = {}) {
  try {
    const {
      survey,
      accumulator,
      from,
      to,
      tags,
      targets,
      campaigns,
      timeZone = config.timezone
    } = options;

    // build query
    const query = {
      survey,
      empty: { $ne: true },
      hide: { $ne: true }
    };

    // apply range
    if (from || to) {
      query.createdAt = {};

      if (from) query.createdAt.$gte = moment(from).tz(timeZone).startOf('day').toDate();
      if (to) query.createdAt.$lte = moment(to).tz(timeZone).endOf('day').toDate();
    }

    if (targets) {
      if (_.isArray(targets)) query.target = { $in: targets };
      if (_.isString(targets)) query.target = targets;
    }

    if (campaigns) {
      if (_.isArray(campaigns)) query.surveyCampaign = { $in: campaigns };
      if (_.isString(campaigns)) query.surveyCampaign = campaigns;
    }

    if (tags) {
      if (_.isArray(tags)) query.tags = { $in: tags };
      if (_.isString(tags)) query.tags = tags;
    }

    // get cursor
    const cursor = SurveyResult.model
      .find(query)
      .select('answer')
      .lean()
      .cursor();

    // iterate cursor and handle answer s
    for (let result = await cursor.next(); result != null; result = await cursor.next()) {
      accumulator.forEach(({ left, right, data }) => {
        const leftValue = getAnswerValue(left, result.answer);
        const rightValue = getAnswerValue(right, result.answer);

        // increment data if both sides have answers
        if (leftValue !== undefined && rightValue !== undefined) {
          data.sum1 += leftValue;
          data.sum2 += rightValue;
          data.sum1sq += leftValue * leftValue;
          data.sum2sq += rightValue * rightValue;
          data.pSum += leftValue * rightValue;
          data.n += 1;
        }
      });
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

// get answer value by entity
function getAnswerValue(entity, answer = {}) {
  if (!answer[entity.surveyItem]) return; // check answer

  // return answer value
  if (!entity.questionItem) return parseInt(answer[entity.surveyItem].value, 10);

  if (
    !answer[entity.surveyItem].questionItems ||
    !answer[entity.surveyItem].questionItems.length
  ) {
    return;
  }

  // return binary value for question item
  return answer[entity.surveyItem].questionItems.includes(entity.questionItem) ? 1 : 0;
}
