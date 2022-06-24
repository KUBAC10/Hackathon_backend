// helpers
import { initSession } from '../helpers/transactions';

// models
import {
  Survey,
  Scope
} from '../models';

// migrate from old scopes
export default async function scopesMigration(done) {
  const session = await initSession();

  try {
    // get scopes cursor
    const cursor = await Scope.model
      .find({ type: { $in: ['global', 'company'] } })
      .cursor();

    await session.withTransaction(async () => {
      for (let scope = await cursor.next(); scope != null; scope = await cursor.next()) {
        const { _id, type, companies = [] } = scope;
        const query = { scope: _id };
        const update = { $set: {
          scope: {
            global: type === 'global',
            companies
          }
        } };

        // set old scope configurations from model to survey
        await Promise.all([
          Survey.model
            .update(query, update, { session })
            .session(session),
          scope
            .remove({ session })
        ]);
      }
    });

    done();
  } catch (e) {
    console.error('Updates error: scopes migration', e);
    return done(e);
  }
}
