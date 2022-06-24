import { Survey } from '../models';

// helpers
import updateSurveyCounters from '../helpers/updateSurveyCounters';

export default async function recountSurveyResults(session, next) {
  try {
    const cursor = Survey.model
      .find()
      .select('_id')
      .lean()
      .cursor();

    for (let survey = await cursor.next(); survey != null; survey = await cursor.next()) {
      // dont use session in update due to big amount of documents
      await updateSurveyCounters(survey._id);
    }
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}
