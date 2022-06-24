// models
import { Survey, SurveyItem } from '../models';

// helpers
import { initSession } from '../helpers/transactions';

export default async function fixPrimaryPulseSurveyItem(done) {
  try {
    const session = await initSession();

    // find primary pulse survey
    const primaryPulse = await Survey.model.findOne({ primaryPulse: true });

    // skip if not present
    if (!primaryPulse) return done();

    await session.withTransaction(async () => {
      // load all surveyItems
      const surveyItems = await SurveyItem
        .model
        .find({ survey: primaryPulse._id });

      for (const item of surveyItems) {
        item.primaryPulse = true;

        await item.save({ session });
      }
    });

    done();
  } catch (e) {
    console.error('Updates error: fix primary pulse survey item');
    console.error(e);
    done(e);
  }
}
