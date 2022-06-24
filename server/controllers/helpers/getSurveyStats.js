import _ from 'lodash';

// models
import {
  Invite,
  SurveyResult,
  PulseSurveyRoundResult
} from '../../models';

export default async function getSurveyStats({ survey, range = {}, roundId, tags }) {
  try {
    const { from, to } = range;
    const query = { survey, preview: { $ne: true } };

    if (from) _.set(query, 'createdAt.$gte', from);
    if (to) _.set(query, 'createdAt.$lte', to);
    if (roundId) query.pulseSurveyRound = roundId;
    if (tags) {
      if (_.isArray(tags) && tags.length) query.tags = { $in: tags };
      if (_.isString(tags)) query.tags = tags;
    }

    // get counts of total results and invites
    const [
      total,
      completed,
      totalInvites,
      overTotal,
      resultsTotal,
    ] = await Promise.all([
      SurveyResult.model
        .find({ ...query, empty: false })
        .countDocuments(),
      SurveyResult.model
        .find({ ...query, lastCompletedAt: { $exists: true } })
        .countDocuments(),
      Invite.model
        .find(query)
        .countDocuments(),
      SurveyResult.model
        .find({ ..._.omit(query, ['createdAt', 'tags']), empty: false })
        .countDocuments(),
      PulseSurveyRoundResult.model
        .find(query)
        .countDocuments()
    ]);

    const completedPercentage = _.ceil((completed / total) * 100, 2) || 0;
    const dropped = total - completed;
    const participationRate = _.ceil((total / resultsTotal) * 100, 2) || 0;

    return {
      total,
      completed,
      dropped,
      totalInvites,
      completedPercentage,
      overTotal,
      participationRate
    };
  } catch (e) {
    return Promise.reject(e);
  }
}
