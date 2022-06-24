import _ from 'lodash';

import { SurveyResultItem } from '../../models';

export default async function getOverallRange(options = {}) {
  const { question, survey } = options;
  let { assets } = options;
  const query = { question };

  if (_.isString(assets)) assets = [assets];

  if (survey) query.survey = survey;
  if (assets) query.assets = { $eq: assets };

  const [first, last] = await Promise.all([
    SurveyResultItem.model
      .findOne(query)
      .sort({ createdAt: 1 })
      .lean(),
    SurveyResultItem.model
      .findOne(query)
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  if (first && last) return { $gte: first.createdAt, $lte: last.createdAt };
}
