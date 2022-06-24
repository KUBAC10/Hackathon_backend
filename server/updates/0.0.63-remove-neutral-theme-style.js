// models
import { SurveyTheme } from '../models';

export default async function removeNeutralThemeStyle(done) {
  try {
    await Promise.all([
      SurveyTheme.model.updateMany({ sectionStyle: 'neutral' }, { sectionStyle: 'dark' })
    ]);

    done();
  } catch (e) {
    console.log(e, 'Update error: removeNeutralThemeStyle');

    return done(e);
  }
}
