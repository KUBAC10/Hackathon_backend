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
  surveyFactory,
  surveyResultFactory
} from '../../../../factories';

chai.config.includeStack = true;

const password = '123123';
const email = 'asd@example.com';
const email2 = 'aasdsd@example.com';

let survey;
let company;

async function makeTestData() {
  company = await companyFactory({});
  const team = await teamFactory({ company });

  survey = await surveyFactory({ company, team });

  await Promise.all([
    surveyResultFactory({ company, team, survey, hide: true }),
    surveyResultFactory({ company, team, survey, hide: true }),
    surveyResultFactory({ company, team, survey, hide: true }),
    surveyResultFactory({ company, team, survey }),
  ]);

  // create power User
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('## GET /api/v1/surveys/:id/count-hidden-responses', () => {
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

      it('should return count of hidden survey results', async () => {
        const res = await agent
          .get(`/api/v1/surveys/${survey._id}/count-hidden-responses`)
          .expect(httpStatus.OK);

        expect(res.body.count).to.be.eq(3);
      });

      it('should return status not found', async () => {
        await agent
          .get(`/api/v1/surveys/${company._id}/count-hidden-responses`)
          .expect(httpStatus.NOT_FOUND);
      });

      it('should reject by scopes', async () => {
        const anotherSurvey = await surveyFactory({});

        await agent
          .get(`/api/v1/surveys/${anotherSurvey._id}/count-hidden-responses`)
          .expect(httpStatus.FORBIDDEN);
      });
    });

    describe('As Team User', () => {
      const agent = request.agent(app);
      beforeEach(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should return count of hidden survey results', async () => {
        const res = await agent
          .get(`/api/v1/surveys/${survey._id}/count-hidden-responses`)
          .expect(httpStatus.OK);

        expect(res.body.count).to.be.eq(3);
      });

      it('should return status not found', async () => {
        await agent
          .get(`/api/v1/surveys/${company._id}/count-hidden-responses`)
          .expect(httpStatus.NOT_FOUND);
      });

      it('should reject by scopes', async () => {
        const anotherSurvey = await surveyFactory({});

        await agent
          .get(`/api/v1/surveys/${anotherSurvey._id}/count-hidden-responses`)
          .expect(httpStatus.FORBIDDEN);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get(`/api/v1/surveys/${survey._id}/count-hidden-responses`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
