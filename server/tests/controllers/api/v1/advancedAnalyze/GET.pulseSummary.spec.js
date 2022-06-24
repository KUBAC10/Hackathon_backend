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
  surveyFactory,
  questionStatisticFactory,
  surveySectionFactory,
  surveyItemFactory,
  questionFactory,
  userFactory,
  pulseSurveyDriverFactory,
  pulseSurveyRoundFactory,
  surveyResultFactory
} from '../../../../factories';

chai.config.includeStack = true;

const password = 'password';
const email1 = 'test1@email.com';

let company;
let team;
let survey;
let section1;
let section2;
let pulseSurveyDriver;
let pulseSurveyRound;
let question1;
let question2;
let question3;
let surveyItem1;
let surveyItem2;
let surveyItem3;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create Power user
  await userFactory({ email: email1, password, company, currentTeam: team, isPowerUser: true });

  survey = await surveyFactory({ team, company });

  [
    pulseSurveyDriver,
    pulseSurveyRound,
  ] = await Promise.all([
    pulseSurveyDriverFactory({ team, company, survey }),
    pulseSurveyRoundFactory({ team, company, survey })
  ]);

  [
    section1,
    section2
  ] = await Promise.all([
    surveySectionFactory({ team, company, pulseSurveyDriver, sortableId: 0 }),
    surveySectionFactory({ team, company, pulseSurveyDriver, sortableId: 1 })
  ]);

  [
    question1,
    question2,
    question3
  ] = await Promise.all([
    questionFactory({ team, company, type: 'linearScale' }),
    questionFactory({ team, company, type: 'linearScale' }),
    questionFactory({ team, company, type: 'netPromoterScore' })
  ]);

  [
    surveyItem1,
    surveyItem2,
    surveyItem3
  ] = await Promise.all([
    surveyItemFactory({ team, company, survey, surveySection: section1, question: question1 }),
    surveyItemFactory({ team, company, survey, surveySection: section1, question: question2 }),
    surveyItemFactory({ team, company, survey, surveySection: section2, question: question3 })
  ]);

  await Promise.all([
    questionStatisticFactory({
      surveyItem: surveyItem1,
      question: question1,
      surveySection: section1,
      pulseSurveyDriver,
      pulseSurveyRound,
      time: moment(),
      data: { 1: 1, 3: 1, 5: 1 }
    }),
    questionStatisticFactory({
      surveyItem: surveyItem1,
      question: question1,
      surveySection: section1,
      pulseSurveyDriver,
      pulseSurveyRound,
      time: moment().subtract(1, 'hour'),
      data: { 1: 1, 3: 1, 5: 1 }
    }),
    questionStatisticFactory({
      surveyItem: surveyItem1,
      question: question1,
      surveySection: section1,
      pulseSurveyDriver,
      pulseSurveyRound,
      time: moment().subtract(2, 'hour'),
      data: { 1: 1, 3: 1, 5: 1 }
    }),
    questionStatisticFactory({
      surveyItem: surveyItem1,
      question: question1,
      surveySection: section1,
      pulseSurveyDriver,
      pulseSurveyRound,
      time: moment().subtract(3, 'hour'),
      data: { 5: 1 }
    }),

    questionStatisticFactory({
      surveyItem: surveyItem2,
      question: question2,
      surveySection: section1,
      pulseSurveyDriver,
      pulseSurveyRound,
      time: moment(),
      data: { 1: 1, 3: 1, 5: 1 }
    }),
    questionStatisticFactory({
      surveyItem: surveyItem2,
      question: question2,
      surveySection: section1,
      pulseSurveyDriver,
      pulseSurveyRound,
      time: moment().subtract(1, 'hour'),
      data: { 1: 1, 3: 1, 5: 1 }
    }),
    questionStatisticFactory({
      surveyItem: surveyItem2,
      question: question2,
      surveySection: section1,
      pulseSurveyDriver,
      pulseSurveyRound,
      time: moment().subtract(2, 'hour'),
      data: { 1: 1, 3: 1, 5: 1 }
    }),
    questionStatisticFactory({
      surveyItem: surveyItem2,
      question: question2,
      surveySection: section1,
      pulseSurveyDriver,
      pulseSurveyRound,
      time: moment().subtract(3, 'hour'),
      data: { 5: 1 }
    }),

    questionStatisticFactory({
      surveyItem: surveyItem3,
      question: question3,
      surveySection: section2,
      pulseSurveyDriver,
      pulseSurveyRound,
      data: { 10: 1 }
    }),

    surveyResultFactory({ team, company, survey, pulseSurveyRound, completed: true, empty: false }),
    surveyResultFactory({ team, company, survey, pulseSurveyRound, completed: true, empty: false }),
    surveyResultFactory({ team, company, survey, pulseSurveyRound, completed: true, empty: true }),
    surveyResultFactory({ team, company, survey, pulseSurveyRound, completed: false, empty: false })
  ]);
}

describe('GET /api/v1/advanced-analyze/surveys/:id/pulse-summary - pulse summary', () => {
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

      it('should return pulse summary report', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/pulse-summary`)
          .expect(httpStatus.OK);

        expect(res.body.surveyStats).to.be.an('object');
        expect(res.body.surveyStats.total).to.be.eq(3);
        expect(res.body.surveyStats.completedPercentage).to.be.eq(100);
        expect(res.body.surveyStats.overTotal).to.be.eq(3);

        expect(res.body.roundsData).to.be.an('array');
        expect(res.body.roundsData.length).to.be.eq(1);

        const [roundData] = res.body.roundsData;

        expect(roundData.avgValue).to.be.eq('3.20');
        expect(roundData.stats.total).to.be.eq(3);
        expect(roundData.stats.completedPercentage).to.be.eq(100);
        expect(roundData.stats.overTotal).to.be.eq(3);
      });
    });
  });
});
