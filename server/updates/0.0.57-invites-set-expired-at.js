import moment from 'moment';

// models
import { Invite } from '../models';

export default async function invitesSetExpiredAt(done) {
  try {
    await Invite.model.remove({
      ttl: { $exists: true, $eq: 86400000 },
      createdAt: { $lte: moment().add(86400000) }
    });

    await Invite.model.remove({
      ttl: { $exists: true, $eq: 604800000 },
      createdAt: { $lte: moment().add(604800000) }
    });

    const cursor = Invite.model
      .find({ ttl: { $exists: true }, expiredAt: { $exists: false } })
      .select('ttl expiredAt')
      .cursor();

    for (let invite = await cursor.next(); invite != null; invite = await cursor.next()) {
      await invite.save();
    }

    console.log('Update complete: set expired at to invites');

    done();
  } catch (e) {
    console.log('Update error: invitesSetExpiredAt');
    return done(e);
  }
}
