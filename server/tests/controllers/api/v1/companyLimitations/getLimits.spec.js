import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  userFactory,
  companyFactory,
  teamUserFactory,
  teamFactory,
  globalConfigFactory,
  companyLimitationFactory
} from '../../../../factories';

chai.config.includeStack = true;

const password = '123123';
const email = 'asd@example.com';
const email2 = 'aasdsd@example.com';

let company;
let defaults;

async function makeTestData() {
  company = await companyFactory({});
  const team = await teamFactory({ company });

  const globalConfig = await globalConfigFactory();

  defaults = globalConfig.companyLimitation;

  // create power User
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });
}

describe('## GET /api/v1/company-limitations', () => {
  beforeEach(cleanData);

  beforeEach(makeTestData);

  describe('Authorized', () => {
    describe('As Power User', () => {
      const agent = request.agent(app);
      beforeEach(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
      });

      it('should return not found', async () => {
        await agent
          .get('/api/v1/company-limitations')
          .expect(httpStatus.NOT_FOUND);
      });

      it('should return limits', async () => {
        await companyLimitationFactory({ company });

        const res = await agent
          .get('/api/v1/company-limitations')
          .expect(httpStatus.OK);

        expect(res.body.responses).to.be.eq(defaults.responses);
        expect(res.body.responsesHide).to.be.eq(defaults.responsesHide);
        expect(res.body.invites).to.be.eq(defaults.invites);
      });
    });

    describe('As Team User', () => {
      const agent = request.agent(app);
      beforeEach(async () => {
        company = await companyFactory({});
        const team = await teamFactory({ company });

        // create Team user
        const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
        await teamUserFactory({ user: teamUser, team, company });

        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should return not found', async () => {
        await agent
          .get('/api/v1/company-limitations')
          .expect(httpStatus.NOT_FOUND);
      });

      it('should return limits', async () => {
        await companyLimitationFactory({ company });

        const res = await agent
          .get('/api/v1/company-limitations')
          .expect(httpStatus.OK);

        expect(res.body.responses).to.be.eq(defaults.responses);
        expect(res.body.responsesHide).to.be.eq(defaults.responsesHide);
        expect(res.body.invites).to.be.eq(defaults.invites);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get('/api/v1/company-limitations')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
