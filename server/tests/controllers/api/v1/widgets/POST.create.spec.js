import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  teamFactory,
  companyFactory,
  userFactory,
  teamUserFactory,
  dashboardFactory
} from '../../../../factories';

chai.config.includeStack = true;

const email = 'test@email.com';
const password = 'qwe123qwe';

let company;
let team;
let dashboard;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  dashboard = await dashboardFactory({ company, team });

  // create users
  const user = await userFactory({
    email,
    password,
    company,
    currentTeam: team,
    isPowerUser: true
  });

  await teamUserFactory({ user, team, company });
}

describe('## POST /api/v1/widgets - create widget', () => {
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

      it('should reject if dashboard not found', async () => {
        await agent
          .post('/api/v1/widgets')
          .send({
            dashboardId: company._id,
            type: 'location'
          })
          .expect(httpStatus.NOT_FOUND);
      });

      it('should create new widget', async () => {
        const res = await agent
          .post('/api/v1/widgets')
          .send({
            dashboardId: dashboard._id,
            type: 'location',
            size: 1,
            chart: true,
            dynamics: true,
            lists: true,
            completion: true,
            response: true,
            overallEngagementScore: true,
            topFive: true,
            withSubDrivers: true
          })
          .expect(httpStatus.CREATED);

        expect(res.body.dashboard.toString()).to.be.eq(dashboard._id.toString());
        expect(res.body.company.toString()).to.be.eq(dashboard.company._id.toString());
        expect(res.body.team.toString()).to.be.eq(dashboard.team._id.toString());
        expect(res.body.type).to.be.eq('location');
        expect(res.body.size).to.be.eq(1);
        expect(res.body.chart).to.be.eq(true);
        expect(res.body.dynamics).to.be.eq(true);
        expect(res.body.lists).to.be.eq(true);
        expect(res.body.completion).to.be.eq(true);
        expect(res.body.response).to.be.eq(true);
        expect(res.body.overallEngagementScore).to.be.eq(true);
        expect(res.body.topFive).to.be.eq(true);
        expect(res.body.withSubDrivers).to.be.eq(true);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post('/api/v1/widgets')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
