// models
import { Question } from '../models';

// helpers
import {
  abortTransaction,
  commitTransaction,
  initSessionWithTransaction
} from '../helpers/transactions';

export default async function renameGridQuestionTypes(done) {
  const session = await initSessionWithTransaction();
  try {
    // rename checkboxesGrid
    const checkboxesGrid = await Question.model.find({ type: 'checkboxesGrid' });
    for (const item of checkboxesGrid) {
      await Question.model.updateOne({ _id: item._id }, { type: 'checkboxGrid' });
    }

    // rename multipleChoicesGrid
    const multipleChoicesGrid = await Question.model.find({ type: 'multipleChoicesGrid' });
    for (const item of multipleChoicesGrid) {
      await Question.model.updateOne({ _id: item._id }, { type: 'multipleChoiceGrid' });
    }

    // commit transaction
    commitTransaction(session)
      .then(() => done())
      .catch((e) => {
        console.error('Updates error: 0.0.23 rename grid question types', e);
        done(e);
      });
  } catch (e) {
    abortTransaction(session).then(() => {
      console.error('Updates error: 0.0.23 rename grid question types');
      console.error(e);
      done(e);
    });
  }
}
