import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory,
  teamFactory,
  userFactory,
  surveyFactory,
  teamUserFactory,
  surveyReportFactory
} from '../../../../factories';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'test@email.com';
const email2 = 'test2@email.com';

let survey;

async function makeTestData() {
  const company = await companyFactory();
  const team = await teamFactory({ company });

  survey = await surveyFactory({ company, team });

  await Promise.all([
    surveyReportFactory({ company, team, survey }),
    surveyReportFactory({ company, team, survey }),
    surveyReportFactory({ company, team, survey })
  ]);

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('## GET /api/v1/survey-reports', () => {
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

      it('should return list of survey reports', async () => {
        const res = await agent
          .get('/api/v1/survey-reports')
          .query({
            survey: survey._id.toString(),
            limit: 10
          })
          .expect(httpStatus.OK);

        const { resources, total } = res.body;

        expect(resources.length).to.be.eq(total).to.be.eq(4);

        resources.forEach((item) => {
          expect(item.range).to.be.eq('summary');
        });
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

      it('should return list of survey reports', async () => {
        const res = await agent
          .get('/api/v1/survey-reports')
          .query({
            survey: survey._id.toString(),
            limit: 10
          })
          .expect(httpStatus.OK);

        const { resources, total } = res.body;

        expect(resources.length).to.be.eq(total).to.be.eq(4);

        resources.forEach((item) => {
          expect(item.range).to.be.eq('summary');
        });
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return unauthorized status', async () => {
      request.agent(app)
        .get('/api/v1/survey-reports')
        .query({
          survey: survey._id.toString(),
          limit: 10
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
