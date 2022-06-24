import chai, { expect } from 'chai';
import app from 'index'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  teamFactory,
  teamUserFactory,
  userFactory
} from 'server/tests/factories';

// models
import { TeamUser } from 'server/models';

chai.config.includeStack = true;

let team;

async function makeTestData() {
  // create team and user
  team = await teamFactory({});
  const team2 = await teamFactory({});
  const user = await userFactory({});

  // create related team users
  await Promise.all([
    teamUserFactory({ team, user }),
    teamUserFactory({ team: team2, user }),
  ]);
}

describe('Team Model', () => {
  describe('Pre remove', () => {
    before(cleanData);

    before(makeTestData);

    it('should remove related team users', async () => {
      const teamId = team._id;

      // remove team
      await team.remove();

      // reload and expect team users
      const reloadTeamUsers = await TeamUser.model.find({ team: teamId });

      expect(reloadTeamUsers.length).to.be.eq(0);
    });
  });
});
