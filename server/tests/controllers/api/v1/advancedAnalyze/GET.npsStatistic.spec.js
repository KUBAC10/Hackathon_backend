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
  surveySectionFactory,
  questionFactory,
  surveyItemFactory,
  questionStatisticFactory,
} from '../../../../factories';

chai.config.includeStack = true;

const password = 'password';
const email1 = 'test1@email.com';
const email2 = 'test2@email.com';

let survey;
let surveyItem1;
let surveyItem2;
let surveyItem3;


async function makeTestData() {
  const company = await companyFactory({});
  const team = await teamFactory({ company });

  survey = await surveyFactory({ company, team });

  const surveySection = await surveySectionFactory({ company, team, survey });

  const [
    question1,
    question2,
    question3
  ] = await Promise.all([
    questionFactory({ company, team, type: 'netPromoterScore' }),
    questionFactory({ company, team, type: 'netPromoterScore' }),
    questionFactory({ company, team, type: 'netPromoterScore' })
  ]);

  [
    surveyItem1,
    surveyItem2,
    surveyItem3
  ] = await Promise.all([
    surveyItemFactory({ company, team, survey, surveySection, question: question1 }),
    surveyItemFactory({ company, team, survey, surveySection, question: question2 }),
    surveyItemFactory({ company, team, survey, surveySection, question: question3 })
  ]);

  await Promise.all([
    questionStatisticFactory({ question: question1, surveyItem: surveyItem1, data: { 1: 2 } }),
    questionStatisticFactory({ question: question2, surveyItem: surveyItem2, data: { 7: 8 } }),
    questionStatisticFactory({ question: question3, surveyItem: surveyItem3, data: { 10: 11 } })
  ]);

  // create Power user
  await userFactory({ email: email1, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('/api/v1/advanced-analyze/surveys/:id/nps-statistic', () => {
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

      it('should return overall nps statistic', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/nps-statistic`)
          .expect(httpStatus.OK);

        const {
          nps,
          detractors,
          detractorsPercent,
          passives,
          passivesPercent,
          promoters,
          promotersPercent,
          currData,
          prevData
        } = res.body;

        expect(nps).to.be.eq('42.9');
        expect(detractors).to.be.eq(2);
        expect(detractorsPercent).to.be.eq('9.52');
        expect(passives).to.be.eq(8);
        expect(passivesPercent).to.be.eq('38.1');
        expect(promoters).to.be.eq(11);
        expect(promotersPercent).to.be.eq('52.4');

        expect(currData).to.be.an('array');
        expect(currData.length).to.be.eq(7);

        expect(prevData).to.be.an('array');
        expect(prevData.length).to.be.eq(0);
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

      it('should return overall nps statistic', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/nps-statistic`)
          .expect(httpStatus.OK);

        const {
          nps,
          detractors,
          detractorsPercent,
          passives,
          passivesPercent,
          promoters,
          promotersPercent,
          currData,
          prevData
        } = res.body;

        expect(nps).to.be.eq('42.9');
        expect(detractors).to.be.eq(2);
        expect(detractorsPercent).to.be.eq('9.52');
        expect(passives).to.be.eq(8);
        expect(passivesPercent).to.be.eq('38.1');
        expect(promoters).to.be.eq(11);
        expect(promotersPercent).to.be.eq('52.4');

        expect(currData).to.be.an('array');
        expect(currData.length).to.be.eq(7);

        expect(prevData).to.be.an('array');
        expect(prevData.length).to.be.eq(0);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return unauthorized status', async () => {
      await request(app)
        .get(`/api/v1/advanced-analyze/surveys/${survey._id}/nps-statistic`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
