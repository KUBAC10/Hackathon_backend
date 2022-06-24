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
    surveyResultFactory({ survey, empty: false, location: { country: 'Country1', city: 'City11' } }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country1', city: 'City22' } }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country1', city: 'City33' } }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country2', city: 'City21' } }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country2', city: 'City22' } }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country2', city: 'City23' } }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country3', city: 'City31' } }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country3', city: 'City32' } }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country3', city: 'City33' } }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country1', city: 'City11' } }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country1', city: 'City22' } }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country1', city: 'City33' } }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country2', city: 'City21' } }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country2', city: 'City22' } }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country2', city: 'City23' } }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country3', city: 'City31' } }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country3', city: 'City32' } }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country3', city: 'City33' } }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country1', city: 'City11' }, createdAt }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country1', city: 'City22' }, createdAt }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country1', city: 'City33' }, createdAt }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country2', city: 'City21' }, createdAt }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country2', city: 'City22' }, createdAt }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country2', city: 'City23' }, createdAt }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country3', city: 'City31' }, createdAt }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country3', city: 'City32' }, createdAt }),
    surveyResultFactory({ survey, empty: false, location: { country: 'Country3', city: 'City33' }, createdAt })
  ]);

  // create Power user
  await userFactory({ email: email1, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('GET /api/v1/advanced-analyze/surveys/:id/locations', () => {
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

      it('should return locations data', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/locations`)
          .expect(httpStatus.OK);

        const { cities, countries, prevData } = res.body;

        expect(prevData).to.be.eq(false);
        expect(cities.every(c => c.count === 3)).to.be.eq(true);
        expect(countries.every(c => c.count === 9)).to.be.eq(true);
        expect(countries.every(c => c.cities.length === 3)).to.be.eq(true);
        expect(countries.every(c => c.cities.every(c => c.count === 3))).to.be.eq(true);
      });

      it('should return locations data by range', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/locations`)
          .query({
            from: moment().subtract(7, 'days').toDate(),
            to: moment().toDate()
          })
          .expect(httpStatus.OK);

        const { cities, countries, prevData } = res.body;

        expect(prevData).to.be.eq(true);
        expect(cities.every(c => c.count === 2)).to.be.eq(true);
        expect(cities.every(c => c.prevCount === 1)).to.be.eq(true);
        expect(countries.every(c => c.count === 6)).to.be.eq(true);
        expect(countries.every(c => c.prevCount === 3)).to.be.eq(true);
        expect(countries.every(c => c.cities.length === 3)).to.be.eq(true);
        expect(countries.every(c => c.cities.every(c => c.count === 2))).to.be.eq(true);
        expect(countries.every(c => c.cities.every(c => c.prevCount === 1))).to.be.eq(true);
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

      it('should return locations data', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/locations`)
          .expect(httpStatus.OK);

        const { cities, countries, prevData } = res.body;

        expect(prevData).to.be.eq(false);
        expect(cities.every(c => c.count === 3)).to.be.eq(true);
        expect(countries.every(c => c.count === 9)).to.be.eq(true);
        expect(countries.every(c => c.cities.length === 3)).to.be.eq(true);
        expect(countries.every(c => c.cities.every(c => c.count === 3))).to.be.eq(true);
      });

      it('should return locations data by range', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/locations`)
          .query({
            from: moment().subtract(7, 'days').toDate(),
            to: moment().toDate()
          })
          .expect(httpStatus.OK);

        const { cities, countries, prevData } = res.body;

        expect(prevData).to.be.eq(true);
        expect(cities.every(c => c.count === 2)).to.be.eq(true);
        expect(cities.every(c => c.prevCount === 1)).to.be.eq(true);
        expect(countries.every(c => c.count === 6)).to.be.eq(true);
        expect(countries.every(c => c.prevCount === 3)).to.be.eq(true);
        expect(countries.every(c => c.cities.length === 3)).to.be.eq(true);
        expect(countries.every(c => c.cities.every(c => c.count === 2))).to.be.eq(true);
        expect(countries.every(c => c.cities.every(c => c.prevCount === 1))).to.be.eq(true);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get(`/api/v1/advanced-analyze/surveys/${survey._id}/locations`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
