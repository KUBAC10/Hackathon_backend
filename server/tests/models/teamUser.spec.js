import chai, { expect } from 'chai';
import app from 'index'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  teamFactory,
  teamUserFactory,
  companyFactory,
  userFactory,
  dashboardItemFactory
} from 'server/tests/factories';

// models
import {
  DashboardItem,
  TeamUser,
  User
} from 'server/models';

chai.config.includeStack = true;

let company;
let team;
let team2;
let user;
let teamUser;
let dashboardItem;

async function makeTestData() {
  // create company
  company = await companyFactory({});
  // create teams
  [
    team,
    team2
  ] = await Promise.all([
    teamFactory({ company }),
    teamFactory({ company })
  ]);
  // create user
  user = await userFactory({ company, currentTeam: team });
  // create team users and dashboard items
  [
    teamUser,
    dashboardItem
  ] = await Promise.all([
    teamUserFactory({ company, team, user }),
    dashboardItemFactory({ company, team, user }),
    teamUserFactory({ company, team: team2, user }),
    dashboardItemFactory({ company, team: team2, user })
  ]);
}

describe('Team User Model', () => {
  describe('Pre remove', () => {
    before(cleanData);

    before(makeTestData);

    it('should automatically remove related entities and change user team', async () => {
      // expect dashboard items and user teams
      const dashboardItems = await DashboardItem.model.find().lean();
      const userTeams = await TeamUser.model.find().lean();
      const user = await User.model.findOne().lean();

      expect(dashboardItems.length).to.be.eq(2);
      expect(dashboardItems.map(d => d._id.toString())).to
        .include(dashboardItem._id.toString());
      expect(userTeams.length).to.be.eq(2);
      expect(userTeams.map(d => d._id.toString())).to
        .include(teamUser._id.toString());
      expect(user.currentTeam.toString()).to.be.eq(team._id.toString());

      // remove team user
      await teamUser.remove({ user, team });

      // expect reloaded dashboard items and user items
      const reloadItem = await DashboardItem.model.find().lean();
      const reloadTeamUser = await TeamUser.model.find().lean();
      const reloadUser = await User.model.findOne().lean();

      expect(reloadItem.length).to.be.eq(1);
      expect(reloadItem.map(d => d._id.toString())).to.not
        .include(dashboardItem._id.toString());
      expect(reloadTeamUser.length).to.be.eq(1);
      expect(reloadTeamUser.map(d => d._id.toString())).to.not
        .include(teamUser._id.toString());
      expect(reloadUser.currentTeam.toString()).to.be.eq(team2._id.toString());
    });
  });
});
