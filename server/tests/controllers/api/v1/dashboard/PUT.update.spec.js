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

const email = 'test@email.com';
const email2 = 'test2@email.com';
const password = '123123123';

let company;
let team;
let dashboard;

async function makeTestData() {
  // Create company and Power User
  company = await companyFactory({});
  team = await teamFactory({});

  await userFactory({ email, password, currentTeam: team, company, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });

  dashboard = await dashboardFactory({ company, team });
}

describe('## GET /api/v1/dashboards/:id - update dashboard', () => {
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

    it('should update dashboard', async () => {
      const res = await agent
        .put(`/api/v1/dashboards/${dashboard._id}`)
        .send({ name: 'New Name' })
        .expect(httpStatus.OK);

      expect(res.body._id.toString()).to.be.eq(dashboard._id.toString());
      expect(res.body.name).to.be.eq('New Name');
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

    it('should update dashboard', async () => {
      const res = await agent
        .put(`/api/v1/dashboards/${dashboard._id}`)
        .send({ name: 'New Name' })
        .expect(httpStatus.OK);

      expect(res.body._id.toString()).to.be.eq(dashboard._id.toString());
      expect(res.body.name).to.be.eq('New Name');
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .put(`/api/v1/dashboards/${dashboard._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});

