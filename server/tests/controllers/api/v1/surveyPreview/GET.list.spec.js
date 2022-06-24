import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';
import uuid from 'uuid/v4';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  inviteFactory,
  teamFactory,
  companyFactory,
  userFactory,
  surveyFactory,
  teamUserFactory,
} from 'server/tests/factories';

chai.config.includeStack = true;

let powerUser;
let teamUser;
let survey;

const email = 'test@email.com';
const email2 = 'test2@email.com';
const password = 'somePassword99';

async function makeTestData() {
  // create company and team
  const company = await companyFactory();
  const team = await teamFactory({ company });
  survey = await surveyFactory();

  // create power User
  powerUser = await userFactory({
    email,
    password,
    company,
    currentTeam: team,
    isPowerUser: true
  });

  // create Team user
  teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });

  // create survey preview token
  await inviteFactory({ survey, token: uuid(), type: 'global', user: powerUser });
  await inviteFactory({ survey, token: uuid(), type: 'global', user: teamUser });
}

describe('## GET /api/v1/survey-preview', () => {
  before(cleanData);

  before(makeTestData);
  describe('Authorized', () => {
    describe('As power user', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
      });

      it('should return list of tokens for preview survey result', async () => {
        const res = await agent
          .get('/api/v1/survey-preview')
          .query({
            surveyId: survey._id.toString(),
            limit: 10
          })
          .expect(httpStatus.OK);
        expect(res.body.resources.length).to.be.eq(1);
        expect(res.body.total).to.be.eq(1);
      });
    });

    describe('As team user', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should return list of tokens for preview survey result', async () => {
        const res = await agent
          .get('/api/v1/survey-preview')
          .query({
            surveyId: survey._id.toString(),
            limit: 10
          })
          .expect(httpStatus.OK);
        expect(res.body.resources.length).to.be.eq(1);
        expect(res.body.total).to.be.eq(1);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get('/api/v1/survey-preview')
        .query({})
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
