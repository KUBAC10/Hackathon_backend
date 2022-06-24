import moment from 'moment';
import _ from 'lodash';

export default function buildQuery(options = {}) {
  const { survey, filters = {}, answers = [], surveyItems = [], skipFilter, range } = options;
  const { assets = [], quizCorrect, quizTotal, createdAt = range || {} } = filters;
  const query = { survey, hide: { $ne: true }, preview: { $ne: true }, empty: { $ne: true }, };

  // set filters by surveyResult
  if (assets.length) query.assets = { $in: assets };
  if (quizCorrect) query.quizCorrect = { $gte: quizCorrect.from, $lte: quizCorrect.to };
  if (quizTotal) query.quizTotal = { $gte: quizTotal.from, $lte: quizTotal.to };
  if (createdAt && (createdAt.from || createdAt.to)) {
    query.createdAt = {};
    if (createdAt.from) query.createdAt.$gte = moment(createdAt.from).startOf('day');
    if (createdAt.to) query.createdAt.$lte = moment(createdAt.to).endOf('day');
  }

  // set filters by answers
  answers.forEach((answer) => {
    const {
      surveyItem,
      questionItems = [],
      gridRow,
      gridColumn,
      value,
      customAnswer,
      country,
      crossings = []
    } = answer;
    const key = `answer.${surveyItem}.`;

    query[`answer.${surveyItem}`] = { $exists: true };

    if (questionItems.length) query[`${key}questionItems`] = questionItems;
    if (customAnswer) query[`${key}customAnswer`] = customAnswer;
    if (country) query[`${key}country`] = country;
    if (!_.isNil(value)) {
      if (_.isArray(value)) query[`${key}value`] = { $in: value };
      if (!_.isArray(value)) query[`${key}value`] = value;
    }
    if (gridRow && gridColumn) {
      query[`${key}crossings.gridRow`] = gridRow;
      query[`${key}crossings.gridColumn`] = gridColumn;
    }
    if (crossings.length) {
      crossings.forEach(({ gridRow, gridColumn }) => {
        query[`${key}crossings.gridRow`] = gridRow;
        query[`${key}crossings.gridColumn`] = gridColumn;
      });
    }
  });

  if (skipFilter) return query;

  // filter results
  surveyItems.forEach((item) => {
    query.$or = [
      ...query.$or || [],
      { [`answer.${item}`]: { $exists: true } }, // where answer exists
      { 'answer.skipped': item } // or this answer in skipped array (accumulate skipped counter)
    ];
  });

  return query;
}
