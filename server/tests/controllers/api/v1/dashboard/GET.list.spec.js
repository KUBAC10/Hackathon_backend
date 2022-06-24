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
  teamUserFactory,
  dashboardFactory
} from '../../../../factories';

chai.config.includeStack = true;

const agent = request.agent(app);

let company;
let team;
const email = 'test@email.com';
const email2 = 'test2@email.com';
const password = '123123123';

async function makeTestData() {
  // Create company and Power User
  company = await companyFactory({});
  team = await teamFactory({});

  await userFactory({ email, password, currentTeam: team, company, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });

  // create dashboards
  await Promise.all([
    dashboardFactory({ company, team }),
    dashboardFactory({ company, team }),
    dashboardFactory({ company, team })
  ]);
}

describe('## GET /api/v1/dashboards - get list of dashboards', () => {
  before(cleanData);

  before(makeTestData);

  describe('As Power User', () => {
    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          password,
          login: email
        });
    });

    it('should return list of dashboards', async () => {
      const res = await agent
        .get('/api/v1/dashboards')
        .expect(httpStatus.OK);

      const { resources, total } = res.body;

      expect(resources).to.be.an('array');
      expect(resources.length).to.be.eq(3);
      expect(total).to.be.eq(3);
    });
  });

  describe('As Team User', () => {
    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          password,
          login: email2
        });
    });

    it('should return list of dashboards', async () => {
      const res = await agent
        .get('/api/v1/dashboards')
        .expect(httpStatus.OK);

      const { resources, total } = res.body;

      expect(resources).to.be.an('array');
      expect(resources.length).to.be.eq(3);
      expect(total).to.be.eq(3);
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get('/api/v1/dashboards')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
