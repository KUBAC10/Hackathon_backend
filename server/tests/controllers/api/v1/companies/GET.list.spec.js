import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  userFactory,
  companyFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'templatemaker@email.com';
const email2 = 'power@email.com';

async function makeTestData() {
  // create companies
  const [company] = await Promise.all([
    companyFactory({}),
    companyFactory({}),
    companyFactory({}),
    companyFactory({}),
  ]);

  // create Template Maker
  await userFactory({ email, password, company, isTemplateMaker: true });

  // create Power User
  await userFactory({ email: email2, password, company, isPowerUser: true });
}

describe('## GET /api/v1/scopes', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('as Template Maker', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email
          });
      });

      it('should show list of companies', async () => {
        const res = await agent
          .get('/api/v1/companies')
          .query({
            limit: 100
          })
          .expect(httpStatus.OK);

        expect(res.body.resources.length).to.be.eq(4);
        expect(res.body.total).to.be.eq(4);
      });
    });

    describe('as Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email2
          });
      });

      it('should return status Forbidden', async () => {
        await agent
          .get('/api/v1/companies')
          .query({
            limit: 100
          })
          .expect(httpStatus.FORBIDDEN);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get('/api/v1/companies')
        .query({
          limit: 100
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
