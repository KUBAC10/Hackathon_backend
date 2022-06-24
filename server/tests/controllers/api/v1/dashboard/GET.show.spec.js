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
  dashboardFactory,
  widgetFactory
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

  // create dashboards widget
  await Promise.all([
    widgetFactory({ company, team, dashboard }),
    widgetFactory({ company, team, dashboard }),
    widgetFactory({ company, team, dashboard })
  ]);
}

describe('## GET /api/v1/dashboards/:id - show dashboard', () => {
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

    it('should return dashboard', async () => {
      const res = await agent
        .get(`/api/v1/dashboards/${dashboard._id}`)
        .expect(httpStatus.OK);

      expect(res.body._id.toString()).to.be.eq(dashboard._id.toString());
      expect(res.body.widgets).to.be.an('array');
      expect(res.body.widgets.length).to.be.eq(3);
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
        .get(`/api/v1/dashboards/${dashboard._id}`)
        .expect(httpStatus.OK);

      expect(res.body._id.toString()).to.be.eq(dashboard._id.toString());
      expect(res.body.widgets).to.be.an('array');
      expect(res.body.widgets.length).to.be.eq(3);
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get(`/api/v1/dashboards/${dashboard._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
