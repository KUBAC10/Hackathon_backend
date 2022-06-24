import { SurveyTheme } from '../models';
import { initSession } from '../helpers/transactions';

export default async function fixDarkThemeBackground(done) {
  try {
    const session = await initSession();

    await session.withTransaction(async () => {
      // dark
      const dark = await SurveyTheme.model.findOne({
        name: 'Dark',
        type: 'global',
        sectionStyle: 'dark',
        questionStyle: 'dark',
        primaryColor: '#3378F7',
        bgColor: '#4b47d9'
      });

      if (dark) {
        dark.bgColor = '#20263B';
        await dark.save({ session });
      }
    });

    done();
  } catch (e) {
    console.error('Updates error: update background color for dark theme', e);
    return done(e);
  }
}
