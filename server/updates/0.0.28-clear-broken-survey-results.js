// models
import { Survey, SurveyResult } from '../models';

// helpers
import {
  abortTransaction,
  commitTransaction,
  initSessionWithTransaction
} from '../helpers/transactions';

export default async function clearBrokenSurveyResults(done) {
  const session = await initSessionWithTransaction();
  try {
    // find survey ids
    const surveys = await Survey.model.find().select('_id').lean();
    const surveyResults = await SurveyResult.model
      .find({ survey: { $nin: surveys.map(survey => survey._id.toString()) } });

    for (const surveyResult of surveyResults) {
      await surveyResult.remove({ session });
    }

    // commit transaction
    commitTransaction(session)
      .then(() => done())
      .catch((e) => {
        console.error('Updates error: 0.0.28 Clear broken survey results', e);
        done(e);
      });
  } catch (e) {
    abortTransaction(session)
      .then(() => {
        console.error('Updates error: clear survey broken results', e);
        done(e);
      })
      .catch(e => done(e));
  }
}
