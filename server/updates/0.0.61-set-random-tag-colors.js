// models
import { Tag } from '../models';

export default async function setDefaultTagColor(done) {
  try {
    const tags = await Tag.model
      .find({});

    for (const tag of tags) {
      await tag.save();
    }

    console.log('Update complete: setDefaultTagColor');

    done();
  } catch (e) {
    console.log('Update error: setDefaultTagColor');

    return done(e);
  }
}
