import httpStatus from 'http-status';
import moment from 'moment';
import _ from 'lodash';

// models
import {
  Survey,
  SurveyResult
} from '../../../models';

// helpers
import { hasAccess } from '../../helpers';
import pearsonCorrelation from '../../helpers/pearsonCorrelation';

/** GET /api/v1/correlation/:id - Return correlation coefficient */
async function calculateCorrelation(req, res, next) {
  try {
    const { id } = req.params;
    const { left, right, range } = req.query;
    const query = { _id: id };

    // find survey by scopes
    const survey = await Survey.model
      .findOne(query)
      .select('_id company team')
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // get correlation coefficient
    const correlation = await _getCorrelationCoefficient({
      left,
      right,
      range,
      survey: survey._id
    });

    return res.send({ correlation: _.ceil(correlation, 5) });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// get correlation between answer values from surveyResult
async function _getCorrelationCoefficient(options = {}) {
  try {
    const { left, right } = options;
    const query = _getQuery(options);

    // make cursor
    const cursor = SurveyResult.model
      .find(query)
      .select(`answer.${left.surveyItem} answer.${right.surveyItem}`)
      .lean()
      .cursor();

    // init values for calculations
    let sum1 = 0;
    let sum2 = 0;
    let sum1sq = 0;
    let sum2sq = 0;
    let pSum = 0;
    let n = 0;

    // scan surveyResults by cursor
    for (let result = await cursor.next(); result != null; result = await cursor.next()) {
      const leftValue = _getValue({
        answer: result.answer[left.surveyItem],
        questionItem: left.questionItem,
        country: left.country
      });
      const rightValue = _getValue({
        answer: result.answer[right.surveyItem],
        questionItem: right.questionItem,
        country: right.country
      });

      sum1 += leftValue;
      sum2 += rightValue;
      sum1sq += leftValue * leftValue;
      sum2sq += rightValue * rightValue;
      pSum += leftValue * rightValue;
      n += 1;
    }

    // calculate and return correlation coefficient
    return pearsonCorrelation({ sum1, sum2, sum1sq, sum2sq, pSum, n });
  } catch (e) {
    /* istanbul ignore next */
    console.error(`_getCorrelationDataValues() Error: ${e}`);
  }
}

// build query from cursor
function _getQuery(options = {}) {
  const { survey, left, right, range = {} } = options;
  const { from, to, overall } = range;
  const query = {
    survey,
    [`answer.${left.surveyItem}`]: { $exists: true },
    [`answer.${right.surveyItem}`]: { $exists: true },
  };

  if (overall) return query;

  return _.assign(query, {
    createdAt: {
      $gte: moment(from).startOf('day').toDate(),
      $lte: moment(to).endOf('day').toDate()
    }
  });
}

// handler for getting value from surveyResult answer object
// end present in like value for correlation calculation
function _getValue(options = {}) {
  const { answer, questionItem, country } = options;

  switch (true) {
    case (country && _.has(answer, 'country')):
      return answer.country === country ? 1 : 0;
    case (questionItem && _.has(answer, 'questionItems')):
      return answer.questionItems.map(i => i.toString()).includes(questionItem) ? 1 : 0;
    case (_.has(answer, 'value') && ['yes', 'no'].includes(answer.value)):
      return answer.value === 'yes' ? 1 : 0;
    default:
      return parseInt(answer.value || 0, 10);
  }
}

export default { calculateCorrelation };
