import httpStatus from 'http-status';

// models
import { SurveyResult } from '../../../models';

// helpers
import { initSession } from '../../../helpers/transactions';
import updateSurveyCounters from '../../../helpers/updateSurveyCounters';

// TODO ??? - check and rebuild
/** DELETE /api/v2/survey-results/remove-one */
async function removeOne(req, res, next) {
  const session = await initSession();
  try {
    // get company id from oauth req.user
    const company = req.user.company;
    const { surveyId, meta } = req.body;
    // build query
    const query = { company, survey: surveyId };

    if (meta) query.$or = _processMeta(meta);

    const surveyResult = await SurveyResult.model
      .findOne(query);

    if (!surveyResult) return res.sendStatus(httpStatus.NOT_FOUND);

    await session.withTransaction(async () => {
      await surveyResult.remove({ session });

      // update counters
      await updateSurveyCounters(surveyResult.survey, session);
    });

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** DELETE /api/v2/survey-result/:id */
async function destroy(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;
    const company = req.user.company;
    const surveyResult = await SurveyResult.model.findOne({ _id: id, company });

    if (!surveyResult) return res.sendStatus(httpStatus.NOT_FOUND);

    await session.withTransaction(async () => {
      await surveyResult.remove({ session });

      // update counters
      await updateSurveyCounters(surveyResult.survey, session);
    });

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** DELETE /api/v2/survey-result/remove-array */
async function removeArray(req, res, next) {
  const session = await initSession();
  try {
    const { idsArray } = req.query;
    const company = req.user.company;
    const surveyResults = await SurveyResult.model.find({ _id: { $in: idsArray }, company });

    if (!surveyResults.length) return res.sendStatus(httpStatus.NOT_FOUND);

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

/** DELETE /api/v2/survey-result/remove-by-meta */
async function removeByMeta(req, res, next) {
  const session = await initSession();
  try {
    const company = req.user.company;
    const { meta } = req.body;
    const query = { company };

    if (meta) query.$or = _processMeta(meta);

    const surveyResults = await SurveyResult.model.find(query);

    if (!surveyResults.length) return res.sendStatus(httpStatus.NOT_FOUND);

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

function _processMeta(meta) {
  return Object.keys(meta).reduce((acc, key) => {
    acc.push({ [`meta.${key}`]: meta[key] });
    return acc;
  }, []);
}

export default {
  removeByMeta,
  removeArray,
  removeOne,
  destroy
};
