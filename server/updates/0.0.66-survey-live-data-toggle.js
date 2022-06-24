import { Survey } from '../models';

export default async function surveyLiveDataToggle(done) {
  try {
    await Survey.model
      .updateMany({ liveData: { $ne: true } }, { $set: { liveData: true } });

    done();
  } catch (e) {
    console.error('Updates error: survey live data toggle');
    console.error(e);
    done(e);
  }
}
