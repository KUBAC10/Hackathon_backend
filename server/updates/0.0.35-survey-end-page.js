import _ from 'lodash';
import { Survey } from '../models';
import { initSession } from '../helpers/transactions';

export default async function surveyEndPage(done) {
  try {
    const session = await initSession();

    await session.withTransaction(async () => {
      // change completeMsg to completePage in all surveys
      const surveys = await Survey.model.find();
      for (const survey of surveys) {
        // check if survey have completeMsg and set it to endPage
        if (survey.completeMsg && _.pickBy(survey.completeMsg, _.identity)) {
          survey.endPage = {
            active: true,
            text: { ...survey.completeMsg }
          };

          // remove old completeMsg field from survey
          survey.set('completeMsg', undefined, { strict: false });

          await survey.save({ session });
        }
      }
    });

    done();
  } catch (e) {
    console.error('Updates error: 0.0.35 survey end page', e);
    done(e);
  }
}
