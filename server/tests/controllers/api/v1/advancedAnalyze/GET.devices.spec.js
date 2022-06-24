import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';
import moment from 'moment';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory,
  teamFactory,
  userFactory,
  surveyFactory,
  surveyResultFactory,
  teamUserFactory,
} from '../../../../factories';

chai.config.includeStack = true;

let survey;
const password = 'password';
const email1 = 'test1@email.com';
const email2 = 'test2@email.com';

async function makeTestData() {
  const company = await companyFactory({});
  const team = await teamFactory({ company });

  survey = await surveyFactory({ company, team });

  const createdAt = moment().subtract(10, 'days').toDate();

  // create survey results
  await Promise.all([
    surveyResultFactory({ survey, empty: false, location: { country: 'Country1', city: 'City11' }, device: 'isDesktop' }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country1', city: 'City22' }, device: 'isDesktop' }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country1', city: 'City33' }, device: 'isDesktop' }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country1', city: 'City33' }, device: 'isMobile' }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country2', city: 'City21' }, device: 'isMobile' }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country2', city: 'City22' }, device: 'isMobile' }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country1', city: 'City11' }, createdAt, device: 'isTablet' }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country1', city: 'City22' }, createdAt, device: 'isTablet' }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country1', city: 'City33' }, createdAt, device: 'isTablet' })
  ]);

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

      it('should return devices data', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/devices`)
          .expect(httpStatus.OK);

        const devices = res.body;

        expect(devices.every(device => device.count === 3)).to.be.eq(true);
        expect(devices.length).to.be.eq(3);
      });

      it('should return devices data by range', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/devices`)
          .query({
            from: moment().subtract(7, 'days').toDate(),
            to: moment().toDate()
          })
          .expect(httpStatus.OK);

        const devices = res.body;

        expect(devices.every(device => device.count === 3)).to.be.eq(true);
        expect(devices.length).to.be.eq(2);
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

      it('should return devices data', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/devices`)
          .expect(httpStatus.OK);

        const devices = res.body;

        expect(devices.every(device => device.count === 3)).to.be.eq(true);
        expect(devices.length).to.be.eq(3);
      });

      it('should return devices data by range', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/devices`)
          .query({
            from: moment().subtract(7, 'days').toDate(),
            to: moment().toDate()
          })
          .expect(httpStatus.OK);

        const devices = res.body;

        expect(devices.every(device => device.count === 3)).to.be.eq(true);
        expect(devices.length).to.be.eq(2);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get(`/api/v1/advanced-analyze/surveys/${survey._id}/devices`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
