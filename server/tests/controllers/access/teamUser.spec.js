import request from 'supertest';
import httpStatus from 'http-status';
import chai from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory,
  teamFactory,
  userFactory,
  teamUserFactory
} from 'server/tests/factories/index';

chai.config.includeStack = true;

// TODO rewrite all

const agent = request.agent(app);

const email1 = 'test@email.com';
const email2 = 'test1@email.com';
const password = '123123123';

let company;
let team;
let validUser;
let wrongUser;
let wrongTeamUser;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });
  [
    validUser,
    wrongUser
  ] = await Promise.all([
    userFactory({ email: email1, password, currentTeam: team, company }),
    userFactory({ email: email2, password })
  ]);

  await teamUserFactory({ user: validUser, company, team }, true);
  await teamUserFactory({ user: wrongUser }, true);
  wrongTeamUser = await teamUserFactory({ user: wrongUser }, true);

  await agent
    .post('/api/v1/authentication')
    .send({
      password,
      login: email2
    });
}

describe('## Team User Access', () => {
  beforeEach(cleanData);

  beforeEach(makeTestData);

  it('should reject with status forbidden when team user has no company', async () => {
    wrongUser.company = undefined;
    await wrongUser.save();
    await agent
      .get('/api/v1/contacts')
      .query({
        limit: 10
      })
      .expect(httpStatus.FORBIDDEN);
  });

  it('should reject with status forbidden when current team is absent', async () => {
    wrongUser.currentTeam = undefined;
    await wrongUser.save();
    await agent
      .get('/api/v1/contacts')
      .query({
        limit: 10
      })
      .expect(httpStatus.FORBIDDEN);
  });

  it('should return status forbidden when team scope was not given', async () => {
    await wrongTeamUser.remove();
    await agent
      .get('/api/v1/contacts')
      .query({
        limit: 10
      })
      .expect(httpStatus.FORBIDDEN);
  });

  it('should response with status Ok for valid team user', async () => {
    await agent
      .post('/api/v1/authentication')
      .send({
        password,
        login: email1
      });

    await agent
      .get('/api/v1/contacts')
      .query({
        limit: 10
      })
      .expect(httpStatus.OK);
  });
});
