// models
import { Survey, SurveyItem } from '../models';

// helpers
import { initSession } from '../helpers/transactions';

export default async function fixPrimaryPulse(done) {
  try {
    const session = await initSession();

    // find primary pulse survey
    const primaryPulse = await Survey.model.findOne({ primaryPulse: true });

    // skip if not present
    if (!primaryPulse) return done();

    await session.withTransaction(async () => {
      // load all surveyItems and populate section to get subdriver / drivers
      const surveyItems = await SurveyItem
        .model
        .find({ survey: primaryPulse._id })
        .populate('surveySection');

      for (const item of surveyItems) {
        // for each item add relation to pulseSurveyDriver
        item.pulseSurveyDriver = item.surveySection.pulseSurveyDriver;
        await item.save({ session });
      }
    });

    done();
  } catch (e) {
    console.error('Updates error: fix primary pulse');
    console.error(e);
    done(e);
  }
}
