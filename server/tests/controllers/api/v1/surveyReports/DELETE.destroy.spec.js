import request from 'supertest';
import httpStatus from 'http-status';
import chai from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory,
  teamFactory,
  userFactory,
  teamUserFactory,
  surveyFactory,
  surveyReportFactory
} from '../../../../factories';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'test@email.com';
const email2 = 'test2@email.com';

let survey;
let company;
let team;
let surveyReport;

async function makeTestData() {
  company = await companyFactory();
  team = await teamFactory({ company });

  survey = await surveyFactory({ company, team });

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });

  await teamUserFactory({ user: teamUser, team, company });
}

describe('## DELETE /api/v1/survey-reports/:id', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('As Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
      });

      it('should delete new survey report', async () => {
        surveyReport = await surveyReportFactory({ company, team, survey });

        await agent
          .delete(`/api/v1/survey-reports/${surveyReport._id}`)
          .expect(httpStatus.NO_CONTENT);
      });

      it('should reject not found status', async () => {
        await agent
          .delete(`/api/v1/survey-reports/${company._id}`)
          .expect(httpStatus.NOT_FOUND);
      });

      it('should reject by scopes', async () => {
        surveyReport = await surveyReportFactory({});

        await agent
          .delete(`/api/v1/survey-reports/${surveyReport._id}`)
          .expect(httpStatus.FORBIDDEN);
      });
    });

    describe('As Team User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should delete new survey report', async () => {
        surveyReport = await surveyReportFactory({ company, team, survey });

        await agent
          .delete(`/api/v1/survey-reports/${surveyReport._id}`)
          .expect(httpStatus.NO_CONTENT);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return unauthorized status', async () => {
      request.agent(app)
        .delete(`/api/v1/survey-reports/${surveyReport._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
