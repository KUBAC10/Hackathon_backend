import { PulseSurveyDriver } from '../models';

export default async function renameDriverIcons(done) {
  try {
    const drivers = await PulseSurveyDriver.model.find({ icon: 'accomplishment' });

    for (const driver of drivers) {
      driver.icon = 'achievement';

      await driver.save();
    }

    done();
  } catch (e) {
    console.error('Updates error: rename driver icons');
    console.error(e);
    done(e);
  }
}
