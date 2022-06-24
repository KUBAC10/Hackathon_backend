import async from 'async';
import moment from 'moment';

// models
import {
  QuestionStatistic,
  SurveyResult,
  SurveyItem,
  Question
} from '../models';

export default async function initQuestionStatistic(done) {
  try {
    // find text questions
    const questions = await Question.model
      .find({ type: { $ne: 'text' } })
      .select('_id')
      .lean();

    // find all survey items
    const surveyItems = await SurveyItem.model
      .find({ question: { $nin: questions.map(q => q._id) } })
      .lean();

    // get survey item ids
    const surveyItemIds = surveyItems.map(i => i._id.toString());

    // get cursor for all survey results
    const cursor = await SurveyResult.model.find().lean().cursor();

    for (let result = await cursor.next(); result != null; result = await cursor.next()) {
      const { answer = {} } = result;

      await _setSyncDB({ answer, surveyItems, surveyItemIds, result });
    }

    done();
  } catch (e) {
    console.error('Updates error: 0.0.36 init question statistic', e);
    done(e);
  }
}

async function _setSyncDB(options = {}) {
  try {
    const { answer, surveyItems, surveyItemIds, result } = options;
    const keys = Object.keys(answer).filter(key => surveyItemIds.includes(key));

    await async.eachLimit(keys, 5, (key, cb) => {
      QuestionStatistic.model
        .update(
          {
            time: moment(result.createdAt).startOf('hour').toDate(),
            surveyItem: key,
            question: surveyItems.find(i => i._id.toString() === key).question
          },
          { $set: { syncDB: false } },
          { upsert: true }
        )
        .then(() => cb())
        .catch(cb);
    });
  } catch (e) {
    console.log(`_setSyncDB() Error: ${e}`);
  }
}
