// models
import {
  Survey,
  SurveyReport
} from '../models';

export default async function createDefaultSurveyReports(done) {
  try {
    const cursor = Survey.model
      .find()
      .populate('surveyReport')
      .lean()
      .cursor();

    for (let survey = await cursor.next(); survey != null; survey = await cursor.next()) {
      if (!survey.surveyReport) {
        const surveyReport = new SurveyReport.model({
          default: true,
          survey: survey._id,
          company: survey.company,
          team: survey.team,
          name: 'Default Survey Report'
        });

        await surveyReport.save();
      }
    }

    console.log('Update complete: createDefaultSurveyReports');

    done();
  } catch (e) {
    console.log('Update error: createDefaultSurveyReports');
    return done(e);
  }
}
