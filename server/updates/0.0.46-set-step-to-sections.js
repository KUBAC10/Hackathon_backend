import async from 'async';

// helpers
import { initSession } from '../helpers/transactions';

// models
import {
  Survey,
  SurveySection
} from '../models';

export default async function setStepToSections(done) {
  const session = await initSession();

  try {
    const cursor = await Survey.model.find().cursor();

    await session.withTransaction(async () => {
      for (let survey = await cursor.next(); survey != null; survey = await cursor.next()) {
        const sections = await SurveySection.model.find({ survey: survey._id }).sort('sortableId');

        await async.eachOfLimit(sections, 5, (section, index, cb) => {
          section.step = index;

          section.save({ session })
            .then(() => cb())
            .catch(cb);
        });
      }
    });

    done();
  } catch (e) {
    console.error('Updates error: ste step to sections', e);
    return done(e);
  }
}
