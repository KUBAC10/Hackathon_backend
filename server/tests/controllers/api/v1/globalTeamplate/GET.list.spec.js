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
  teamFactory,
  surveyFactory,
  teamUserFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

const email = 'expample@email.com';
const email2 = 'expample2@email.com';
const email3 = 'expample3@email.com';
const password = 'password';

async function makeTestData() {
  // create company and team
  const company = await companyFactory({});
  const team = await teamFactory({ company });

  // create TemplateMaker
  const templateMaker = await userFactory({
    email,
    password,
    company,
    currentTeam: team,
    isTemplateMaker: true
  });

  // create surveys
  await Promise.all([
    surveyFactory({ company, team, createdBy: templateMaker, type: 'template' }),
    surveyFactory({ company, team, createdBy: templateMaker, type: 'template' }),
    surveyFactory({ company, team, createdBy: templateMaker, type: 'template' }),
    surveyFactory({ company, team, type: 'template' }),
    surveyFactory({ company, team, type: 'template' }),
  ]);

  // create Power User
  await userFactory({ email: email2, password, company, currentTeam: team, isPowerUser: true });

  // create Team User
  const teamUser = await userFactory({ email: email3, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('## GET /api/v1/global-templates', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
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

      it('should return templates created by this power user', async () => {
        const res = await agent
          .get('/api/v1/global-templates')
          .query({
            limit: 10
          })
          .expect(httpStatus.OK);

        expect(res.body.resources.length).to.be.eq(3);
        expect(res.body.total).to.be.eq(3);
      });
    });

    describe('As Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should return status Forbidden', async () => {
        await agent
          .get('/api/v1/global-templates')
          .query({
            limit: 10
          })
          .expect(httpStatus.FORBIDDEN);
      });
    });

    describe('As Team User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email3,
            password
          });
      });

      it('should return status Forbidden', async () => {
        await agent
          .get('/api/v1/global-templates')
          .query({
            limit: 10
          })
          .expect(httpStatus.FORBIDDEN);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get('/api/v1/global-templates')
        .query({
          limit: 10
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
