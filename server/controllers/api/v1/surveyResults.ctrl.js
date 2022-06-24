import httpStatus from 'http-status';
import mongoose from 'mongoose';
import _ from 'lodash';

// models
import {
  SurveyResult,
  PulseSurveyRecipient,
  PulseSurveyRound,
  Survey
} from '../../../models';

// helpers
import { initSession } from '../../../helpers/transactions';
import updateSurveyCounters from '../../../helpers/updateSurveyCounters';
import handleScopes from '../../helpers/handleScopes';
import { hasAccess } from '../../helpers';

// TODO move to cron-job
/** DELETE /api/v1/survey-results/batch-remove */
async function batchRemove(req, res, next) {
  const session = await initSession();
  try {
    const { idsArray } = req.body;

    const query = { _id: { $in: idsArray } };

    handleScopes({ reqScopes: req.scopes, query });

    // find survey results
    const surveyResults = await SurveyResult.model.find(query);

    // return error if survey results not found
    if (!surveyResults.length) return res.sendStatus(httpStatus.NO_CONTENT);

    await session.withTransaction(async () => {
      // remove results one by one
      for (const surveyResult of surveyResults) {
        await surveyResult.remove({ session });
      }

      // update counters
      await updateSurveyCounters(surveyResults[0].survey, session);
    });

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// TODO test
/** GET /api/v1/survey-results/recipients - get recipients results list */
async function recipientResults(req, res, next) {
  try {
    const { survey: surveyId, skip = 0, limit = 30, sort, tags } = req.query;

    const survey = await Survey.model
      .findOne({ _id: surveyId })
      .populate({
        path: 'surveyItems',
        populate: {
          path: 'question'
        }
      })
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const { surveyItems = [] } = survey;

    // get invalid for average values survey items
    const omitItems = surveyItems
      .filter(i => i.question && i.question.type !== 'linearScale')
      .map(i => i._id);

    const query = { survey: survey._id };

    if (tags) {
      const toObjectId = mongoose.Types.ObjectId;

      if (_.isArray(tags)) query.tags = { $in: tags.map(toObjectId) };
      if (!_.isArray(tags)) query.tags = { $in: [toObjectId(tags)] };
    }

    const [
      recipients, // load list of recipients
      total, // total of recipients
      rounds // load related rounds
    ] = await Promise.all([
      PulseSurveyRecipient.model
        .find(query, '-contact -email')
        .skip(skip)
        .limit(limit)
        .sort(sort || { lastAnswerDate: 'desc' })
        .populate([
          {
            path: 'surveyResults',
            select: '-email'
          },
          // {
          //   path: 'contact'
          // }
        ]) // populate recipient survey results
        .lean(),
      PulseSurveyRecipient.model
        .find(query)
        .countDocuments(),
      PulseSurveyRound.model
        .find({ survey: survey._id })
        .sort({ sortableId: 'asc' })
        .lean()
    ]);

    // handle recipients
    for (const recipient of recipients) {
      handleRecipientData({ recipient, rounds, omitItems });
    }

    return res.send({
      resources: recipients,
      rounds,
      total
    });
  } catch (e) {
    return next(e);
  }
}

// TODO test
/** GET /api/v1/survey-results/recipients/:id - get recipients result */
async function recipientResult(req, res, next) {
  try {
    const { id } = req.params;
    const { survey: surveyId } = req.query;

    const survey = await Survey.model
      .findOne({ _id: surveyId })
      .populate({
        path: 'surveyItems',
        populate: {
          path: 'question'
        }
      })
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const { surveyItems = [] } = survey;

    // get invalid for average values survey items
    const omitItems = surveyItems
      .filter(i => i.question && i.question.type !== 'linearScale')
      .map(i => i._id);

    const [
      recipient,
      rounds
    ] = await Promise.all([
      PulseSurveyRecipient.model
        .findOne({ _id: id }, '-contact')
        .populate([
          {
            path: 'surveyResults'
          },
          // {
          //   path: 'contact'
          // }
        ]) // populate recipient survey results
        .lean(),
      PulseSurveyRound.model
        .find({ survey: survey._id })
        .sort({ sortableId: 'asc' })
        .lean()
    ]);

    if (!recipient) return res.sendStatus(httpStatus.NOT_FOUND);

    handleRecipientData({ recipient, rounds, omitItems });

    return res.send({ recipient, rounds });
  } catch (e) {
    return next(e);
  }
}

function handleRecipientData({ recipient, rounds, omitItems }) {
  const { surveyResults = [] } = recipient;

  // init accumulator values
  rounds.forEach((round) => {
    _.set(recipient, `rounds.${round._id}.sum`, 0);
    _.set(recipient, `rounds.${round._id}.n`, 0);
    _.set(recipient, 'positive', 0);
    _.set(recipient, 'negative', 0);
  });

  // handle results and collect data for average round value
  surveyResults.forEach((result) => {
    const { answer = {}, pulseSurveyRound } = result;

    // omit invalid survey items
    const validAnswers = _.omit(answer, omitItems);

    Object.keys(validAnswers).forEach((key) => {
      const value = validAnswers[key].value;

      if (value) {
        recipient.rounds[pulseSurveyRound].sum += value;
        recipient.rounds[pulseSurveyRound].n += 1;
      }
    });
  });

  // calculate average round value
  rounds.forEach((round) => {
    const { sum = 0, n = 0 } = _.get(recipient, `rounds.${round._id}`);

    const avg = ((sum / n) || 0).toPrecision(3);

    _.set(recipient, `rounds.${round._id}.averageValue`, avg);

    // TODO count deviations
    if (n && avg > 3) recipient.positive += 1;
    if (n && avg <= 3) recipient.negative += 1;
  });

  recipient.negativeDeviation = recipient.positive < recipient.negative;
}

export default {
  batchRemove,
  recipientResults,
  recipientResult
};
