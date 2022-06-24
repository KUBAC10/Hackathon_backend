import { Survey } from '../models';
import {
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
} from '../helpers/transactions';

export default async function removePublicFromSurveys(done) {
  const session = await initSessionWithTransaction();

  try {
    // load surveys
    const surveys = await Survey.model.find();

    for (const survey of surveys) {
      survey.set('public', undefined, { strict: false });
      await survey.save();
    }

    await commitTransaction(session);

    done();
  } catch (e) {
    abortTransaction(session).then(() => {
      console.error('Updates error: remove-public-from-surveys');
      console.error(e);
      done(e);
    });
  }
}
