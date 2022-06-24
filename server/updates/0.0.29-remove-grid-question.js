import async from 'async';

// models
import { Question, GridColumn } from '../models';

// helpers
import {
  abortTransaction,
  commitTransaction,
  initSessionWithTransaction
} from '../helpers/transactions';

export default async function removeGridQuestions(done) {
  const session = await initSessionWithTransaction();
  try {
    // find questions
    const questions = await Question.model.find({ type: { $in: ['multipleChoiceGrid', 'checkboxGrid'] } }, '_id type', { session });
    // find related GridColumns
    const columns = await GridColumn.model.find({ question: { $in: questions.map(i => i._id) } }, '_id sortableId', { session });

    // handle questions and change type
    async.eachLimit(questions, 5, (question, cb) => {
      // switch question types
      if (question.type === 'multipleChoiceGrid') question.type = 'multipleChoiceMatrix';
      if (question.type === 'checkboxGrid') question.type = 'checkboxMatrix';

      // update question
      Question.model.updateOne(
        { _id: question._id },
        { type: question.type },
        { session }
      )
        .then(() => cb())
        .catch(err => cb(err));
    }, (err) => {
      if (err) {
        return abortTransaction(session).then(() => {
          console.error('Updates error: 0.0.29 Remove grid question');
          console.error(err);
          done(err);
        });
      }

      // handle columns
      async.eachLimit(columns, 5, (column, callback) => {
        // update column
        GridColumn.model.updateOne(
          { _id: column._id },
          { score: column.sortableId + 1 },
          { session }
        )
          .then(() => callback())
          .catch(err => callback(err));
      }, (err) => {
        if (err) {
          return abortTransaction(session).then(() => {
            console.error('Updates error: 0.0.29 Remove grid question');
            console.error(err);
            done(err);
          });
        }

        // commit transaction
        commitTransaction(session)
          .then(() => done())
          .catch(er => console.log(er));
      });
    });
  } catch (e) {
    abortTransaction(session)
      .then(() => {
        console.error('Updates error: Remove grid question', e);
        done(e);
      })
      .catch(e => done(e));
  }
}
