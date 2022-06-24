import _ from 'lodash';

import {
  Survey,
  SurveyResult
} from '../../server/models';

export default async function updateSurveyCounters(done) {
  try {
    // update surveyResults with new flag
    let cursor = SurveyResult.model
      .find()
      .select('_id answer')
      .lean()
      .cursor();

    // iterate cursor
    for (let result = await cursor.next(); result != null; result = await cursor.next()) {
      // set empty flag if result no have answers
      await SurveyResult.model.updateOne({ _id: result._id }, { empty: _.isEmpty(result.answer) });
    }

    // get cursor from surveys
    cursor = Survey.model
      .find({ type: 'survey' })
      .select('_id')
      .lean()
      .cursor();

    // iterate cursor
    for (let survey = await cursor.next(); survey != null; survey = await cursor.next()) {
      // get count of not empty surveyResults
      const totalResults = await SurveyResult.model
        .find({ survey: survey._id, empty: false })
        .countDocuments();

      await Survey.model.updateOne({ _id: survey._id }, { totalResults });
    }

    done();
  } catch (e) {
    console.error('Updates error: 0.0.40 update survey counters', e);
    done(e);
  }
}
