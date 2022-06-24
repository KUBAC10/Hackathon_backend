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
  pulseSurveyDriverFactory,
} from '../../../../factories';

chai.config.includeStack = true;

const password = 'password';
const email1 = 'test1@email.com';
const email2 = 'test2@email.com';

let survey;
let drivers;

async function makeTestData() {
  const company = await companyFactory({});
  const team = await teamFactory({ company });

  survey = await surveyFactory({ company, team });

  drivers = await Promise.all([
    pulseSurveyDriverFactory({ survey }),
    pulseSurveyDriverFactory({ survey }),
    pulseSurveyDriverFactory({ survey })
  ]);

  drivers = drivers.map(driver => driver._id.toString());

  // create Power user
  await userFactory({ email: email1, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('GET /api/v1/advanced-analyze/surveys/:id/devices', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('As Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email1,
            password
          });
      });

      it('should return list of pulse survey drivers', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/pulse-drivers`)
          .expect(httpStatus.OK);

        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.eq(3);

        res.body.forEach((i) => {
          expect(drivers.includes(i._id.toString())).to.be.eq(true);
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

      it('should return list of pulse survey drivers', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/pulse-drivers`)
          .expect(httpStatus.OK);

        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.eq(3);

        res.body.forEach((i) => {
          expect(drivers.includes(i._id.toString())).to.be.eq(true);
        });
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get(`/api/v1/advanced-analyze/surveys/${survey._id}/pulse-drivers`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
