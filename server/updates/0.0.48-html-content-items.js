//  helpers
import { initSession } from '../helpers/transactions';

//  models
import {
  SurveyItem,
  ContentItem
} from '../models';

export default async function migrateHtmlToContentItem(done) {
  const session = await initSession();
  try {
    const cursor = await SurveyItem.model.find({ type: 'html' }).cursor();

    await session.withTransaction(async () => {
      for (let item = await cursor.next(); item != null; item = await cursor.next()) {
        const { company, team, html, survey, _id } = item;
        const newContentItem = new ContentItem.model({
          company,
          team,
          html,
          survey,
          type: 'content',
          contentType: 'html',
          surveyItem: _id
        });

        newContentItem.save({ session })
          .then(async () => {
            item.html = {};
            item.type = 'contents';

            await item.save({ session })
              .catch(e => done(e));
          })
          .catch(e => done(e));
      }
    });
    done();
  } catch (e) {
    console.log('Update error: migrate html from survey item to content item');
    return done(e);
  }
}
