import chai, { expect } from 'chai';
import app from 'index'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  teamFactory,
  contactFactory,
} from 'server/tests/factories';

chai.config.includeStack = true;

let team;
let contact;

async function makeTestData() {
  [
    team,
    contact,
  ] = await Promise.all([
    teamFactory({}, true),
    contactFactory({}),
  ]);
}

describe('Contact Model', () => {
  describe('Pre save', () => {
    before(cleanData);

    before(makeTestData);

    it('should automatically set team company', async () => {
      contact.team = team;
      await contact.save();
      expect(contact.company.toString()).to.be.eq(team.company.toString());
    });
  });
});
