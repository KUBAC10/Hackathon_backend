import _ from 'lodash';
import {
  Survey,
  Invite,
  SurveyResult
} from '../models';
import {
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
} from '../helpers/transactions';

export default async function setSurveyCounters(done) {
  const session = await initSessionWithTransaction();
  try {
    // find surveys to update
    const surveys = await Survey.model.find().select('_id').lean();
    if (surveys) {
      for (const survey of surveys) {
        // find counters data
        const totalInvites = await Invite
          .model
          .find({ survey: survey._id })
          .countDocuments();
        const totalCompleted = await SurveyResult
          .model
          .find({ survey: survey._id, completed: true })
          .countDocuments();
        const item = await SurveyResult
          .model
          .findOne({ survey: survey._id })
          .select('updatedAt')
          .sort({ updatedAt: -1 }) || null;
        const lastAnswerDate = _.get(item, 'updatedAt', null);

        // update survey
        await Survey.model.updateOne(
          {
            _id: survey._id
          },
          {
            totalInvites,
            totalCompleted,
            lastAnswerDate
          }
        );
      }
    }

    // commit transaction
    commitTransaction(session)
      .then(() => done())
      .catch((e) => {
        console.error('Updates error: set-survey-counters-fields', e);
        done(e);
      });
  } catch (e) {
    abortTransaction(session).then(() => {
      console.error('Updates error: set-survey-counters-fields', e);
      done(e);
    });
  }
}
