// models
import {
  Survey,
  SurveyReport,
  SurveyReportItem
} from '../models';

// helpers
import { loadSurveyDoc } from '../controllers/helpers';

export default async function limitReportItems(done) {
  try {
    // load surveys
    const surveys = await Survey.model
      .find()
      .populate('surveyItems')
      .lean();

    // filter surveys where surveyItems count > 30
    const bigSurveys = surveys.filter(s => s.surveyItems.length && s.surveyItems.length > 30);

    for (const bigSurvey of bigSurveys) {
      // get surveyItems to hide
      const survey = await loadSurveyDoc({ _id: bigSurvey._id });

      const { surveySections = [] } = survey;

      const surveyItems = surveySections
        .reduce((acc, { surveyItems = [] }) => ([...acc, ...surveyItems]), [])
        .slice(30);

      // load survey reports
      const surveyReports = await SurveyReport.model
        .find({ survey: bigSurvey._id })
        .select('_id')
        .lean();

      for (const surveyReport of surveyReports) {
        for (const surveyItem of surveyItems) {
          // update/create surveyReportItems and set hide status
          await SurveyReportItem.model
            .updateOne({
              surveyReport: surveyReport._id,
              surveyItem: surveyItem._id,
              company: bigSurvey.company,
              type: 'surveyReport'
            }, {
              $set: { hide: true }
            }, {
              upsert: true
            });
        }
      }
    }

    done();
  } catch (e) {
    return done(e);
  }
}
