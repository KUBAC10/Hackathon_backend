import {
  Survey,
  SurveyResult,
} from '../models';
import {
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
} from '../helpers/transactions';

export default async function setTotalResultsCounter(done) {
  const session = await initSessionWithTransaction();
  try {
    // find surveys to update
    const surveys = await Survey.model.find().select('_id').lean();
    if (surveys) {
      for (const survey of surveys) {
        const totalResults = await SurveyResult
          .model
          .find({ survey: survey._id })
          .countDocuments();

        // update survey
        await Survey.model.updateOne({ _id: survey._id }, { totalResults });
      }
    }

    // commit transaction
    commitTransaction(session)
      .then(() => done())
      .catch((e) => {
        console.error('Updates error: fix-survey-total-completed-value', e);
        done(e);
      });
  } catch (e) {
    abortTransaction(session).then(() => {
      console.error('Updates error: fix-survey-total-completed-value', e);
      done(e);
    });
  }
}
