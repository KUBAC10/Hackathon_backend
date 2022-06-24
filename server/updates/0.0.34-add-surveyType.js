import { Survey } from '../models';

export default async function addSurveyType(done) {
  try {
    // set surveyType as "survey" to all surveys in system
    await Survey.model.updateMany({}, { surveyType: 'survey' });

    done();
  } catch (e) {
    console.error('Updates error: 0.0.34 add survey type', e);
    done(e);
  }
}
