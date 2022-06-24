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

// models
import {
  Dashboard,
  Widget
} from '../../../../../models';

chai.config.includeStack = true;

const agent = request.agent(app);

const email = 'test@email.com';
const email2 = 'test2@email.com';
const password = '123123123';

let company;
let team;
let dashboard;
let widget;

async function makeTestData() {
  // Create company and Power User
  company = await companyFactory({});
  team = await teamFactory({});

  await userFactory({ email, password, currentTeam: team, company, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('## GET /api/v1/dashboards/:id - delete dashboard', () => {
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

    it('should delete dashboard', async () => {
      dashboard = await dashboardFactory({ company, team });
      widget = await widgetFactory({ company, team, dashboard });

      await agent
        .delete(`/api/v1/dashboards/${dashboard._id}`)
        .expect(httpStatus.NO_CONTENT);

      const [
        reloadDashboard,
        reloadWidget
      ] = await Promise.all([
        Dashboard.model.findById(dashboard._id).lean(),
        Widget.model.findById(widget._id).lean(),
      ]);

      expect(reloadDashboard).to.be.eq(null);
      expect(reloadWidget).to.be.eq(null);
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

    it('should delete dashboard', async () => {
      dashboard = await dashboardFactory({ company, team });
      widget = await widgetFactory({ company, team, dashboard });

      await agent
        .delete(`/api/v1/dashboards/${dashboard._id}`)
        .expect(httpStatus.NO_CONTENT);

      const [
        reloadDashboard,
        reloadWidget
      ] = await Promise.all([
        Dashboard.model.findById(dashboard._id).lean(),
        Widget.model.findById(widget._id).lean(),
      ]);

      expect(reloadDashboard).to.be.eq(null);
      expect(reloadWidget).to.be.eq(null);
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .delete(`/api/v1/dashboards/${dashboard._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});

