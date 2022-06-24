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
  pulseSurveyRoundFactory
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
    pulseSurveyRound
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
  ]);
}

describe('GET /api/v1/advanced-analyze/:surveyId/driver/:pulseSurveyDriverId - driver report', () => {
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

      it('should return driver report', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/${survey._id}/driver/${pulseSurveyDriver._id}`)
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(pulseSurveyDriver._id.toString());
        expect(res.body.driverAvg).to.be.eq('3.20');
        expect(res.body.surveySections).to.be.an('array');
        expect(res.body.surveySections.length).to.be.eq(1);

        const [section1] = res.body.surveySections;

        expect(section1.subDriverAvg).to.be.eq('3.20');

        expect(section1.surveyItems).to.be.an('array');
        expect(section1.surveyItems.length).to.be.eq(2);

        const [item1, item2] = section1.surveyItems;

        expect(item1.questionAvg).to.be.eq('3.20');
        expect(item2.questionAvg).to.be.eq('3.20');
      });

      it('should return driver report filtered by round', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/${survey._id}/driver/${pulseSurveyDriver._id}`)
          .query({ roundId: pulseSurveyRound._id.toString() })
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(pulseSurveyDriver._id.toString());
        expect(res.body.driverAvg).to.be.eq('3.00');
        expect(res.body.surveySections).to.be.an('array');
        expect(res.body.surveySections.length).to.be.eq(1);

        const [section1] = res.body.surveySections;

        expect(section1.subDriverAvg).to.be.eq('3.00');

        expect(section1.surveyItems).to.be.an('array');
        expect(section1.surveyItems.length).to.be.eq(2);

        const [item1, item2] = section1.surveyItems;

        expect(item1.questionAvg).to.be.eq('3.00');
        expect(item2.questionAvg).to.be.eq('3.00');
      });
    });
  });
});
