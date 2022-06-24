// models
import { Survey, SurveyItem } from '../models';

// helpers
import { initSession } from '../helpers/transactions';

export default async function fixPrimaryPulseItemQuestion(done) {
  try {
    const session = await initSession();

    // find primary pulse survey
    const primaryPulse = await Survey.model.findOne({ primaryPulse: true });

    // skip if not present
    if (!primaryPulse) return done();

    await session.withTransaction(async () => {
      // load all surveyItems wit questions
      const surveyItems = await SurveyItem
        .model
        .find({ survey: primaryPulse._id })
        .populate('question');

      for (const item of surveyItems) {
        const { question } = item;

        if (question) {
          question.primaryPulse = true;

          await question.save({ session });
        }
      }
    });

    done();
  } catch (e) {
    console.error('Updates error: fix primary pulse question');
    console.error(e);
    done(e);
  }
}
