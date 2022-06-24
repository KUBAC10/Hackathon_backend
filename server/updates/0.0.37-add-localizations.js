import { Content } from '../models';
import {
  abortTransaction,
  commitTransaction,
  initSessionWithTransaction
} from '../helpers/transactions';

export default async function addLocalizations(done) {
  const session = await initSessionWithTransaction();
  try {
    const langs = [
      { nameShort: 'it', name: 'Italiano' },
      { nameShort: 'ja', name: 'Japanese' },
      { nameShort: 'ko', name: 'Korean' },
      { nameShort: 'zh', name: 'Chinese' }
    ];

    for (const lang of langs) {
      const langDoc = await Content.model.findOne({ nameShort: lang.nameShort }).lean();

      if (!langDoc) {
        await Content.model.create({ name: lang.name, nameShort: lang.nameShort });
      }
    }

    // commit transaction
    commitTransaction(session)
      .then(() => done())
      .catch((e) => {
        console.error('Updates error: addLocalizations', e);
        done(e);
      });
  } catch (e) {
    abortTransaction(session).then(() => {
      console.error('Updates error: addLocalizations', e);
      done(e);
    });
  }
}
