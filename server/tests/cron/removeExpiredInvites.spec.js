import chai, { expect } from 'chai';
import moment from 'moment';
import app from '../../..'; // eslint-disable-line

// factories
import {
  inviteFactory,
  companyFactory,
  teamFactory
} from '../factories';

// helpers
import cleanData from '../testHelpers/cleanData';

// models
import { Invite } from '../../models';

// cron
import removeExpiredInvites from '../../cron/removeExpiredInvites';

chai.config.includeStack = true;

async function makeTestData() {
  const company = await companyFactory({});
  const team = await teamFactory({ company });

  await Promise.all([
    inviteFactory({ company, team, ttl: 86400000 }),
    inviteFactory({ company, team, ttl: 86400000, createdAt: moment().subtract(1, 'day') })
  ]);
}

describe('## Remove expired invites', () => {
  before(cleanData);

  before(makeTestData);

  it('should remove expired invites', async () => {
    let count = await Invite.model.find().countDocuments();

    expect(count).to.be.eq(2);

    await removeExpiredInvites();

    count = await Invite.model.find().countDocuments();

    expect(count).to.be.eq(1);
  });
});
