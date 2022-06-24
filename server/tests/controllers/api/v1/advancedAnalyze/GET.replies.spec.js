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
let company;
let team;
const password = 'password';
const email1 = 'test1@email.com';
const email2 = 'test2@email.com';


async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  survey = await surveyFactory({ company, team });

  // create survey results
  await Promise.all([
    surveyResultFactory({ survey }),
    surveyResultFactory({ survey, empty: false }),
    surveyResultFactory({ survey, empty: false }),
    surveyResultFactory({ survey, empty: false }),
    surveyResultFactory({ survey, empty: false }),
    surveyResultFactory({ survey, empty: false, completed: true }),
    surveyResultFactory({ survey, empty: false, completed: true }),
    surveyResultFactory({ survey, empty: false, completed: true, createdAt: moment().subtract(1, 'day') })
  ]);

  // create Power user
  await userFactory({ email: email1, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('GET /api/v1/advanced-analyze/surveys/:id/replies', () => {
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

      it('should return replies data', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/replies`)
          .expect(httpStatus.OK);

        const {
          currData,
          prevData,
          started,
          completed,
          dropped,
          completionRate
        } = res.body;

        expect(started).to.be.eq(7);
        expect(completed).to.be.eq(3);
        expect(dropped).to.be.eq(4);
        expect(completionRate).to.be.eq(42.86);
        expect(currData).to.be.an('array');
        expect(prevData).to.be.an('array');
        expect(currData.some(d => d.started === 1)).to.be.eq(true);
        expect(currData.some(d => d.started === 6)).to.be.eq(true);
        expect(currData.some(d => d.completed === 1)).to.be.eq(true);
        expect(currData.some(d => d.completed === 2)).to.be.eq(true);
        expect(currData.some(d => d.dropped === 4)).to.be.eq(true);
        expect(currData.some(d => d.completionRate === 100)).to.be.eq(true);
        expect(currData.some(d => d.completionRate === 33.34)).to.be.eq(true);
        expect(prevData.every(d => d.started === 0)).to.be.eq(true);
        expect(prevData.every(d => d.completed === 0)).to.be.eq(true);
        expect(prevData.every(d => d.dropped === 0)).to.be.eq(true);
        expect(prevData.every(d => d.completionRate === 0)).to.be.eq(true);
      });

      it('should return replies data by range', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/replies`)
          .query({
            from: moment().subtract(20, 'days').format('x'),
            to: moment().format('x')
          })
          .expect(httpStatus.OK);

        const {
          currData,
          prevData,
          started,
          completed,
          dropped,
          completionRate
        } = res.body;

        expect(started).to.be.eq(7);
        expect(completed).to.be.eq(3);
        expect(dropped).to.be.eq(4);
        expect(completionRate).to.be.eq(42.86);
        expect(currData).to.be.an('array');
        expect(prevData).to.be.an('array');
        expect(currData.some(d => d.started === 1)).to.be.eq(true);
        expect(currData.some(d => d.started === 6)).to.be.eq(true);
        expect(currData.some(d => d.completed === 1)).to.be.eq(true);
        expect(currData.some(d => d.completed === 2)).to.be.eq(true);
        expect(currData.some(d => d.dropped === 4)).to.be.eq(true);
        expect(currData.some(d => d.completionRate === 100)).to.be.eq(true);
        expect(currData.some(d => d.completionRate === 33.34)).to.be.eq(true);
        expect(prevData.every(d => d.started === 0)).to.be.eq(true);
        expect(prevData.every(d => d.completed === 0)).to.be.eq(true);
        expect(prevData.every(d => d.dropped === 0)).to.be.eq(true);
        expect(prevData.every(d => d.completionRate === 0)).to.be.eq(true);
      });

      it('should return status not found', async () => {
        await agent
          .get(`/api/v1/advanced-analyze/surveys/${company._id}/replies`)
          .expect(httpStatus.NOT_FOUND);
      });

      it('should return status forbidden', async () => {
        const fakeSurvey = await surveyFactory({});

        await agent
          .get(`/api/v1/advanced-analyze/surveys/${fakeSurvey._id}/replies`)
          .expect(httpStatus.FORBIDDEN);
      });

      it('should return replies data by range where days more then 30', async () => {
        // create new survey for test
        const newSurvey = await surveyFactory({ company, team });

        // create results for new survey
        await Promise.all([
          surveyResultFactory({ survey: newSurvey }),
          surveyResultFactory({ survey: newSurvey, empty: false }),
          surveyResultFactory({ survey: newSurvey, empty: false }),
          surveyResultFactory({ survey: newSurvey, empty: false }),
          surveyResultFactory({ survey: newSurvey, empty: false }),
          surveyResultFactory({ survey: newSurvey, empty: false, completed: true }),
          surveyResultFactory({ survey: newSurvey, empty: false, completed: true }),
          surveyResultFactory({ survey: newSurvey, empty: false, completed: true }),
          surveyResultFactory({ survey: newSurvey, empty: false, completed: true, createdAt: moment().subtract(40, 'day') })
        ]);

        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${newSurvey._id}/replies`)
          .query({
            from: moment().subtract(31, 'days').format('x'),
            to: moment().format('x')
          })
          .expect(httpStatus.OK);

        const {
          currData,
          prevData,
          started,
          completed,
          dropped,
          completionRate
        } = res.body;

        expect(started).to.be.eq(7);
        expect(completed).to.be.eq(3);
        expect(dropped).to.be.eq(4);
        expect(completionRate).to.be.eq(42.86);
        expect(currData).to.be.an('array');
        expect(prevData).to.be.an('array');
        expect(currData.some(d => d.started === 7)).to.be.eq(true);
        expect(currData.some(d => d.completed === 3)).to.be.eq(true);
        expect(currData.some(d => d.dropped === 4)).to.be.eq(true);
        expect(currData.some(d => d.completionRate === 42.86)).to.be.eq(true);
        expect(prevData.some(d => d.started === 1)).to.be.eq(true);
        expect(prevData.some(d => d.completed === 1)).to.be.eq(true);
        expect(prevData.some(d => d.dropped === 0)).to.be.eq(true);
        expect(prevData.some(d => d.completionRate === 100)).to.be.eq(true);
      });

      it('should return replies data by range where days more then 90', async () => {
        // create new survey for test
        const newSurvey = await surveyFactory({ company, team });

        // create results for new survey
        await Promise.all([
          surveyResultFactory({ survey: newSurvey }),
          surveyResultFactory({ survey: newSurvey, empty: false }),
          surveyResultFactory({ survey: newSurvey, empty: false }),
          surveyResultFactory({ survey: newSurvey, empty: false }),
          surveyResultFactory({ survey: newSurvey, empty: false }),
          surveyResultFactory({ survey: newSurvey, empty: false, completed: true }),
          surveyResultFactory({ survey: newSurvey, empty: false, completed: true }),
          surveyResultFactory({ survey: newSurvey, empty: false, completed: true, createdAt: moment().subtract(1, 'day') }),
          surveyResultFactory({ survey: newSurvey, empty: false, completed: true, createdAt: moment().subtract(5, 'months') })
        ]);

        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${newSurvey._id}/replies`)
          .query({
            from: moment().subtract(91, 'days').format('x'),
            to: moment().format('x')
          })
          .expect(httpStatus.OK);

        const {
          currData,
          prevData,
          started,
          completed,
          dropped,
          completionRate
        } = res.body;

        expect(started).to.be.eq(7);
        expect(completed).to.be.eq(3);
        expect(dropped).to.be.eq(4);
        expect(completionRate).to.be.eq(42.86);
        expect(currData).to.be.an('array');
        expect(prevData).to.be.an('array');
        expect(currData.some(d => d.started === 7)).to.be.eq(true);
        expect(currData.some(d => d.completed === 3)).to.be.eq(true);
        expect(currData.some(d => d.dropped === 4)).to.be.eq(true);
        expect(currData.some(d => d.completionRate === 42.86)).to.be.eq(true);
        expect(prevData.some(d => d.started === 1)).to.be.eq(true);
        expect(prevData.some(d => d.completed === 1)).to.be.eq(true);
        expect(prevData.some(d => d.dropped === 0)).to.be.eq(true);
        expect(prevData.some(d => d.completionRate === 100)).to.be.eq(true);
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

      it('should return replies data', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/replies`)
          .expect(httpStatus.OK);

        const {
          currData,
          prevData,
          started,
          completed,
          dropped,
          completionRate
        } = res.body;

        expect(started).to.be.eq(7);
        expect(completed).to.be.eq(3);
        expect(dropped).to.be.eq(4);
        expect(completionRate).to.be.eq(42.86);
        expect(currData).to.be.an('array');
        expect(prevData).to.be.an('array');
        expect(currData.some(d => d.started === 1)).to.be.eq(true);
        expect(currData.some(d => d.started === 6)).to.be.eq(true);
        expect(currData.some(d => d.completed === 1)).to.be.eq(true);
        expect(currData.some(d => d.completed === 2)).to.be.eq(true);
        expect(currData.some(d => d.dropped === 4)).to.be.eq(true);
        expect(currData.some(d => d.completionRate === 100)).to.be.eq(true);
        expect(currData.some(d => d.completionRate === 33.34)).to.be.eq(true);
        expect(prevData.every(d => d.started === 0)).to.be.eq(true);
        expect(prevData.every(d => d.completed === 0)).to.be.eq(true);
        expect(prevData.every(d => d.dropped === 0)).to.be.eq(true);
        expect(prevData.every(d => d.completionRate === 0)).to.be.eq(true);
      });

      it('should return replies data by range', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/replies`)
          .query({
            from: moment().subtract(30, 'days').format('x'),
            to: moment().format('x')
          })
          .expect(httpStatus.OK);

        const {
          currData,
          prevData,
          started,
          completed,
          dropped,
          completionRate
        } = res.body;

        expect(started).to.be.eq(7);
        expect(completed).to.be.eq(3);
        expect(dropped).to.be.eq(4);
        expect(completionRate).to.be.eq(42.86);
        expect(currData).to.be.an('array');
        expect(prevData).to.be.an('array');
        expect(currData.some(d => d.started === 1)).to.be.eq(true);
        expect(currData.some(d => d.started === 6)).to.be.eq(true);
        expect(currData.some(d => d.completed === 1)).to.be.eq(true);
        expect(currData.some(d => d.completed === 2)).to.be.eq(true);
        expect(currData.some(d => d.dropped === 4)).to.be.eq(true);
        expect(currData.some(d => d.completionRate === 100)).to.be.eq(true);
        expect(currData.some(d => d.completionRate === 33.34)).to.be.eq(true);
        expect(prevData.every(d => d.started === 0)).to.be.eq(true);
        expect(prevData.every(d => d.completed === 0)).to.be.eq(true);
        expect(prevData.every(d => d.dropped === 0)).to.be.eq(true);
        expect(prevData.every(d => d.completionRate === 0)).to.be.eq(true);
      });

      it('should return status not found', async () => {
        await agent
          .get(`/api/v1/advanced-analyze/surveys/${company._id}/replies`)
          .expect(httpStatus.NOT_FOUND);
      });

      it('should return status forbidden', async () => {
        const fakeSurvey = await surveyFactory({});

        await agent
          .get(`/api/v1/advanced-analyze/surveys/${fakeSurvey._id}/replies`)
          .expect(httpStatus.FORBIDDEN);
      });

      it('should return replies data by range where days more then 30', async () => {
        // create new survey for test
        const newSurvey = await surveyFactory({ company, team });

        // create results for new survey
        await Promise.all([
          surveyResultFactory({ survey: newSurvey }),
          surveyResultFactory({ survey: newSurvey, empty: false }),
          surveyResultFactory({ survey: newSurvey, empty: false }),
          surveyResultFactory({ survey: newSurvey, empty: false }),
          surveyResultFactory({ survey: newSurvey, empty: false }),
          surveyResultFactory({ survey: newSurvey, empty: false, completed: true }),
          surveyResultFactory({ survey: newSurvey, empty: false, completed: true }),
          surveyResultFactory({ survey: newSurvey, empty: false, completed: true }),
          surveyResultFactory({ survey: newSurvey, empty: false, completed: true, createdAt: moment().subtract(40, 'day') })
        ]);

        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${newSurvey._id}/replies`)
          .query({
            from: moment().subtract(31, 'days').format('x'),
            to: moment().format('x')
          })
          .expect(httpStatus.OK);

        const {
          currData,
          prevData,
          started,
          completed,
          dropped,
          completionRate
        } = res.body;

        expect(started).to.be.eq(7);
        expect(completed).to.be.eq(3);
        expect(dropped).to.be.eq(4);
        expect(completionRate).to.be.eq(42.86);
        expect(currData).to.be.an('array');
        expect(prevData).to.be.an('array');
        expect(currData.some(d => d.started === 7)).to.be.eq(true);
        expect(currData.some(d => d.completed === 3)).to.be.eq(true);
        expect(currData.some(d => d.dropped === 4)).to.be.eq(true);
        expect(currData.some(d => d.completionRate === 42.86)).to.be.eq(true);
        expect(prevData.some(d => d.started === 1)).to.be.eq(true);
        expect(prevData.some(d => d.completed === 1)).to.be.eq(true);
        expect(prevData.some(d => d.dropped === 0)).to.be.eq(true);
        expect(prevData.some(d => d.completionRate === 100)).to.be.eq(true);
      });

      it('should return replies data by range where days more then 90', async () => {
        // create new survey for test
        const newSurvey = await surveyFactory({ company, team });

        // create results for new survey
        await Promise.all([
          surveyResultFactory({ survey: newSurvey }),
          surveyResultFactory({ survey: newSurvey, empty: false }),
          surveyResultFactory({ survey: newSurvey, empty: false }),
          surveyResultFactory({ survey: newSurvey, empty: false }),
          surveyResultFactory({ survey: newSurvey, empty: false }),
          surveyResultFactory({ survey: newSurvey, empty: false, completed: true }),
          surveyResultFactory({ survey: newSurvey, empty: false, completed: true }),
          surveyResultFactory({ survey: newSurvey, empty: false, completed: true, createdAt: moment().subtract(1, 'day') }),
          surveyResultFactory({ survey: newSurvey, empty: false, completed: true, createdAt: moment().subtract(5, 'months') })
        ]);

        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${newSurvey._id}/replies`)
          .query({
            from: moment().subtract(91, 'days').format('x'),
            to: moment().format('x')
          })
          .expect(httpStatus.OK);

        const {
          currData,
          prevData,
          started,
          completed,
          dropped,
          completionRate
        } = res.body;

        expect(started).to.be.eq(7);
        expect(completed).to.be.eq(3);
        expect(dropped).to.be.eq(4);
        expect(completionRate).to.be.eq(42.86);
        expect(currData).to.be.an('array');
        expect(prevData).to.be.an('array');
        expect(currData.some(d => d.started === 7)).to.be.eq(true);
        expect(currData.some(d => d.completed === 3)).to.be.eq(true);
        expect(currData.some(d => d.dropped === 4)).to.be.eq(true);
        expect(currData.some(d => d.completionRate === 42.86)).to.be.eq(true);
        expect(prevData.some(d => d.started === 1)).to.be.eq(true);
        expect(prevData.some(d => d.completed === 1)).to.be.eq(true);
        expect(prevData.some(d => d.dropped === 0)).to.be.eq(true);
        expect(prevData.some(d => d.completionRate === 100)).to.be.eq(true);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get(`/api/v1/advanced-analyze/surveys/${survey._id}/replies`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
