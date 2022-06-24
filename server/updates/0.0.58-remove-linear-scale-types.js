//  models
import {
  Question
} from '../models';

// remove ordinary / thumb / button types
export default async function removeLinScTypes(done) {
  try {
    await Question.model
      .updateMany(
        { 'linearScale.icon': { $in: ['ordinary', 'thumb', 'button'] } },
        { 'linearScale.icon': 'star' }
      );

    done();
  } catch (e) {
    console.log('Update error: removeLinScTypes');
    done(e);
  }
}
