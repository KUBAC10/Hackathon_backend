// models
import {
  Survey,
  PulseSurveyDriver
} from '../models';

export default async function setDriverSortableId(done) {
  try {
    const surveys = await Survey.model
      .find({ surveyType: 'pulse' })
      .lean();

    for (const survey of surveys) {
      let sortableId = 0;

      const drivers = await PulseSurveyDriver.model
        .find({ survey: survey._id })
        .sort('createdAt');

      for (const driver of drivers) {
        driver.sortableId = sortableId;

        await driver.save();

        sortableId += 1;
      }
    }

    done();
  } catch (e) {
    console.error('Updates error: set driver sortable id');
    console.error(e);
    done(e);
  }
}
