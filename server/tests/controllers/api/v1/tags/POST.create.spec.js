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
  teamFactory
} from '../../../../factories';

chai.config.includeStack = true;

const email = 'expample@email.com';
const email2 = 'expample2@email.com';
const password = 'password';

async function makeTestData() {
  // create company and team
  const company = await companyFactory({});
  const team = await teamFactory({ company });

  // create TemplateMaker
  await userFactory({
    email,
    password,
    company,
    currentTeam: team,
    isTemplateMaker: true
  });

  // create PowerUser
  await userFactory({
    email: email2,
    password,
    company,
    currentTeam: team,
    isPowerUser: true
  });
}

describe('## GET /api/v1/global-templates', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('As Power Maker', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should crete global tag', async () => {
        const res = await agent
          .post('/api/v1/tags')
          .send({
            name: 'Global Tag',
            isGlobal: true
          })
          .expect(httpStatus.CREATED);

        expect(res.body.isGlobal).to.be.eq(false);
      });
    });

    describe('As Template Maker', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
      });

      it('should crete global tag', async () => {
        const res = await agent
          .post('/api/v1/tags')
          .send({
            name: 'Global Tag 2',
            isGlobal: true
          })
          .expect(httpStatus.CREATED);

        expect(res.body.isGlobal).to.be.eq(true);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post('/api/v1/tags')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
