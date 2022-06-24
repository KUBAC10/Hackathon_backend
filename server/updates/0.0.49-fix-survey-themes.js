//  helpers
import { initSession } from '../helpers/transactions';

//  models
import {
  SurveyTheme
} from '../models';

export default async function fixSurveyThemes(done) {
  const session = await initSession();
  try {
    const cursor = await SurveyTheme.model
      .find({ type: 'survey' })
      .populate({ path: 'survey', select: 'company team' })
      .cursor();

    await session.withTransaction(async () => {
      for (let theme = await cursor.next(); theme != null; theme = await cursor.next()) {
        if (theme.survey && theme.survey.company && theme.survey.team) {
          const { company, team } = theme.survey;

          theme.company = company;
          theme.team = team;

          await theme.save({ session });
        }
      }
    });

    done();
  } catch (e) {
    console.log('Update error: fix survey themes');
    return done(e);
  }
}
