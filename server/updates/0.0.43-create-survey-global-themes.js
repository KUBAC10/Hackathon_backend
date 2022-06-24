import { SurveyTheme } from '../models';
import { initSession } from '../helpers/transactions';

export default async function surveyGlobalThemes(done) {
  try {
    const session = await initSession();

    await session.withTransaction(async () => {
      // dark
      const dark = new SurveyTheme.model({
        name: 'Dark',
        type: 'global',
        sectionStyle: 'dark',
        questionStyle: 'dark',
        primaryColor: '#3378F7',
        bgColor: '#4b47d9'
      });
      await dark.save({ session });

      // light theme
      const light = new SurveyTheme.model({
        name: 'Light',
        type: 'global',
        sectionStyle: 'neutral',
        questionStyle: 'light',
        primaryColor: '#3378F7',
        bgColor: '#E5E8F7'
      });
      await light.save({ session });

      // neutral theme
      const neutral = new SurveyTheme.model({
        name: 'Neutral',
        type: 'global',
        sectionStyle: 'dark',
        questionStyle: 'light',
        primaryColor: '#3378F7',
        bgColor: '#4b47d9'
      });
      await neutral.save({ session });
    });

    done();
  } catch (e) {
    console.error('Updates error: create survey global themes', e);
    return done(e);
  }
}
