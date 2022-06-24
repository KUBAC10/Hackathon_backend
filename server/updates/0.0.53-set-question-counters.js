import {
  Survey,
  SurveyItem
} from '../models';

export default async function setQuestionCounters(done) {
  try {
    const surveys = await Survey.model.find({
      questionsCount: { $exists: false },
      inTrash: { $ne: true }
    });

    for (const survey of surveys) {
      survey.questionsCount = await SurveyItem.model.find({
        survey: survey._id,
        type: { $in: ['question', 'trendQuestion'] },
        inDraft: { $ne: true },
        inTrash: { $ne: true }
      }).countDocuments();

      await survey.save();
    }

    console.log(`Updated ${surveys.length} survey question counters`);

    done();
  } catch (e) {
    console.error('Updates error: 0.0.53 set question counters', e);
    done(e);
  }
}
