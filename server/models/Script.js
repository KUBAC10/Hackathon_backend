import keystone from 'keystone';

// transactions
import {
  initSession
} from '../helpers/transactions';

// scripts
import scripts from '../scripts';

/**
 * Script Model
 * ===================
 */
const Script = new keystone.List('Script', {
  track: true,
  defaultSort: '-createdAt'
});

Script.add({
  name: {
    type: String,
    initial: true,
    requited: true,
  },
  successful: {
    type: Boolean,
    default: false
  }
});

Script.schema.pre('save', async function (next) {
  try {
    const session = await initSession();

    await session.withTransaction(async () => {
      await scripts[this.name](session, next);
      this.successful = true;
    });

    next();
  } catch (e) {
    return next(e);
  }
});

/**
 * Registration
 */
Script.defaultColumns = 'name args';
Script.register();

export default Script;
