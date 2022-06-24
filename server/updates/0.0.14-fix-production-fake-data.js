/* eslint-disable */

import { Survey, SurveyResult } from '../models';

export default async function fixProductionData(done) {
  try {
    const [
      survey1,
      survey2
    ] = await Promise.all([
      Survey.model.findById('5c9929edff00be5ca6560909').lean(),
      Survey.model.findById('5c978dfaacfb300c6799b430').lean()
    ]);

    if (!survey1 || !survey2) return done();

    const results = await SurveyResult.model.find({
      $and: [
        { survey: survey1 },
        { survey: survey2 },
      ]
    });
    // set results to completed
    for (const result of results) {
      result.set('completed', true);
      await result.save();
    }
    done();
  } catch (e) {
    done(e);
  }
}
