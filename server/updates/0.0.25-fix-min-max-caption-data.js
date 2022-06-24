// models
import { Question } from '../models';

// helpers
import {
  abortTransaction,
  commitTransaction,
  initSessionWithTransaction
} from '../helpers/transactions';

export default async function fixMinMaxCaptionData(done) {
  const session = await initSessionWithTransaction();
  try {
    // find all string captions questions
    const questions = await Question.model.find(
      {
        $or: [
          { 'linearScale.fromCaption': { $type: 2 } },
          { 'linearScale.to': { $type: 2 } }
        ]
      });

    for (const question of questions) {
      question.set('linearScale.fromCaption', undefined, { strict: false });
      question.set('linearScale.toCaption', undefined, { strict: false });
      await question.save();
    }

    // // commit transaction
    commitTransaction(session)
      .then(() => done())
      .catch((e) => {
        console.error('Updates error: 0.0.25 fix min max question capture', e);
        done(e);
      });
  } catch (e) {
    abortTransaction(session).then(() => {
      console.error('Updates error: 0.0.25 fix min max question capture', e);
      done(e);
    });
  }
}
