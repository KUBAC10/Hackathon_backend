// models
import { Survey, SurveySection } from '../models';

// helpers
import { initSession } from '../helpers/transactions';

export default async function fixPrimaryPulseSection(done) {
  try {
    const session = await initSession();

    // find primary pulse survey
    const primaryPulse = await Survey.model.findOne({ primaryPulse: true });

    // skip if not present
    if (!primaryPulse) return done();

    await session.withTransaction(async () => {
      // load all sections
      const sections = await SurveySection
        .model
        .find({ survey: primaryPulse._id });

      for (const section of sections) {
        section.primaryPulse = true;

        await section.save({ session });
      }
    });

    done();
  } catch (e) {
    console.error('Updates error: fix primary pulse section');
    console.error(e);
    done(e);
  }
}
