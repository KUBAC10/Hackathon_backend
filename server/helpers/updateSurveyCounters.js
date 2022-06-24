// models
import {
  Survey,
  SurveyResult
} from '../models';

// count survey stats data
export default async function updateSurveyCounters(surveyId, session) {
  try {
    // find survey results
    const [
      totalResults,
      totalCompleted
    ] = await Promise.all([
      SurveyResult.model
        .find({ survey: surveyId, empty: false })
        .session(session)
        .countDocuments(),
      SurveyResult.model
        .find({ survey: surveyId, completed: true })
        .session(session)
        .countDocuments()
    ]);

    // update survey
    await Survey.model.updateOne(
      { _id: surveyId },
      { $set: { totalResults, totalCompleted } },
      { session }
    );
  } catch (e) {
    return Promise.reject(e);
  }
}
