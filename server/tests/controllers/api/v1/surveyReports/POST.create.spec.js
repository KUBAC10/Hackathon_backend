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
  teamUserFactory
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

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('## POST /api/v1/survey-reports', () => {
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

      it('should create new survey report', async () => {
        const res = await agent
          .post('/api/v1/survey-reports')
          .send({ survey: survey._id })
          .expect(httpStatus.OK);

        expect(res.body.name).to.be.eq('Survey Report');
        expect(res.body.default).to.be.eq(false);
        expect(res.body.range).to.be.eq('summary');
        expect(res.body.survey.toString()).to.be.eq(survey._id.toString());
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

      it('should create new survey report', async () => {
        const res = await agent
          .post('/api/v1/survey-reports')
          .send({ survey: survey._id })
          .expect(httpStatus.OK);

        expect(res.body.name).to.be.eq('Survey Report');
        expect(res.body.default).to.be.eq(false);
        expect(res.body.range).to.be.eq('summary');
        expect(res.body.survey.toString()).to.be.eq(survey._id.toString());
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return unauthorized status', async () => {
      request.agent(app)
        .post('/api/v1/survey-reports')
        .send({ survey: survey._id })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
