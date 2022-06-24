import { Content } from '../models';
import {
  abortTransaction,
  commitTransaction,
  initSessionWithTransaction
} from '../helpers/transactions';

export default async function addChineseTradLang(done) {
  const session = await initSessionWithTransaction();
  try {
    const chSimpLang = await Content.model.findOne({ nameShort: 'zh' });
    if (chSimpLang) {
      chSimpLang.name = 'Chinese (Simplified)';
      await chSimpLang.save();
    }

    const chTrandLang = await Content.model.findOne({ nameShort: 'zh-Hant' }).lean();

    if (!chTrandLang) {
      await Content.model.create({
        nameShort: 'zh-Hant',
        name: 'Chinese (Traditional)'
      });
    }

    // commit transaction
    commitTransaction(session)
      .then(() => done())
      .catch((e) => {
        console.error('Updates error: addChineseTradLang', e);
        done(e);
      });
  } catch (e) {
    abortTransaction(session).then(() => {
      console.error('Updates error: addChineseTradLang', e);
      done(e);
    });
  }
}
