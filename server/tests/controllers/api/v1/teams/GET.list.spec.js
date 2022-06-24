import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  teamFactory,
  userFactory,
  companyFactory,
  teamUserFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'teamUser@email.com';
const email2 = 'powerUser@email.com';

let team1;
let team2;
let company1;

let teamUser;

async function makeTestData() {
  // create companies
  [
    company1
  ] = await Promise.all([
    companyFactory({})
  ]);

  // create teams
  [
    team1,
    team2,
  ] = await Promise.all([
    teamFactory({ company: company1 }),
    teamFactory({ company: company1 }),
    teamFactory({ company: company1 })
  ]);

  // create team user for 2 teams
  teamUser = await userFactory({ email, password, company: company1, currentTeam: team1 });
  await teamUserFactory({ user: teamUser, team: team1, company: company1 });
  await teamUserFactory({ user: teamUser, team: team2, company: company1 });

  // create power user
  await userFactory({
    password,
    email: email2,
    company: company1,
    currentTeam: team1,
    isPowerUser: true
  });
}

describe('## GET /api/v1/teams List', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized by Power User', () => {
    const agent = request.agent(app);
    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          password,
          login: email2
        });
    });

    describe('Power User scope', () => {
      it('should return list of teams by power user scope', async () => {
        const res = await agent
          .get('/api/v1/teams')
          .query({
            limit: 100
          })
          .expect(httpStatus.OK);

        expect(res.body.resources.length).to.be.eq(3);
      });
    });

    it('should return list of teams without current user teams', async () => {
      const res = await agent
        .get('/api/v1/teams')
        .query({
          limit: 100,
          withoutUserTeams: teamUser._id.toString()
        })
        .expect(httpStatus.OK);

      expect(res.body.resources.length).to.be.eq(1);
    });
  });

  describe('Authorized by Team User', () => {
    const agent = request.agent(app);
    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          password,
          login: email
        });
    });

    describe('Team User scope', () => {
      it('should return list of teams by user teams scope', async () => {
        const res = await agent
          .get('/api/v1/teams')
          .query({
            limit: 100
          })
          .expect(httpStatus.OK);

        expect(res.body.resources.length).to.be.eq(2);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post('/api/v1/teams')
        .send({})
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
