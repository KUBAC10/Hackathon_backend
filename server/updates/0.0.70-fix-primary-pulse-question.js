// models
import { Question, Survey } from '../models';

// helpers
import { initSession } from '../helpers/transactions';

export default async function fixPrimaryPulseQuestion(done) {
  try {
    const session = await initSession();

    // find primary pulse survey
    const primaryPulse = await Survey.model.findOne({ primaryPulse: true });

    // skip if not present
    if (!primaryPulse) return done();

    await session.withTransaction(async () => {
      // load all questions
      const questions = await Question
        .model
        .find({ survey: primaryPulse._id });

      for (const question of questions) {
        question.primaryPulse = true;

        await question.save({ session });
      }
    });

    done();
  } catch (e) {
    console.error('Updates error: fix primary pulse question');
    console.error(e);
    done(e);
  }
}
