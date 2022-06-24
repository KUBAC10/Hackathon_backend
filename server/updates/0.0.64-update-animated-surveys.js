// models
import { Survey } from '../models';

export default async function updateAnimatedSurveys(done) {
  try {
    await Survey.model
      .updateMany({ customAnimation: true }, { $set: { displaySingleQuestion: true } });

    done();
  } catch (e) {
    console.log(e, 'Update error: updateAnimatedSurveys');

    return done(e);
  }
}
