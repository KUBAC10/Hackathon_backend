import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import { TeamUser } from 'server/models';

// factories
import {
  userFactory,
  teamFactory,
  companyFactory,
  teamUserFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

let team;
let team2;
let team3;
let company;
let user;

const password = 'qwe123qwe';
const email = 'test@email.com';

async function makeTestData() {
  // create company and team
  company = await companyFactory({});
  team = await teamFactory({ company });
  team2 = await teamFactory({ company });
  team3 = await teamFactory({ company });

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });
  user = await userFactory({ company, currentTeam: team2 });

  // create related team users models
  await Promise.all([
    teamUserFactory({ company, team, user }),
    teamUserFactory({ company, team: team2, user })
  ]);
}

describe('## PUT /api/v1/users/:id', () => {
  before(cleanData);

  before(makeTestData);

  const agent = request.agent(app);
  describe('Authorized', () => {
    describe('As Power User', () => {
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
      });

      it('should update user with new data', async () => {
        const res = await agent
          .put(`/api/v1/users/${user._id.toString()}`)
          .send({
            name: { first: 'ad', last: 'da' },
            defaultLanguage: 'de',
            email: 'asd@asd.com',
            userTeams: [team._id.toString(), team3._id.toString()]
          }).expect(httpStatus.OK);

        // should delete redundant team user
        const deletedTeamUser = await TeamUser.model.findOne({
          team: team2._id,
          user: user._id
        });
        expect(deletedTeamUser).to.be.eq(null);

        // should delete redundant team user
        const createdTeamUser = await TeamUser.model.findOne({
          team: team3._id,
          user: user._id
        })
          .populate('team');
        expect(createdTeamUser.team._id.toString()).to.be.eq(team3._id.toString());

        // should set current team to first team of user teams
        expect(res.body.currentTeam).to.be.not.eq(team2._id.toString());

        // should response correct data
        expect(res.body.userTeams.length).to.be.eq(2);
        expect(res.body.name.first).to.be.eq('ad');
      });

      it('should reject if user not found', async () => {
        await agent
          .put(`/api/v1/users/${company._id.toString()}`)
          .send({
            name: { first: 'ad', last: 'da' },
            defaultLanguage: 'de',
            email: 'asd@asd.com'
          })
          .expect(httpStatus.NOT_FOUND);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .put(`/api/v1/users/${user._id.toString()}`)
        .send({
          name: 'test',
        }).expect(httpStatus.UNAUTHORIZED);
    });
  });
});
