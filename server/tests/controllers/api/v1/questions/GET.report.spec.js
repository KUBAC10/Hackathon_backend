import moment from 'moment';
import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory,
  questionFactory,
  teamFactory,
  userFactory,
  teamUserFactory,
  questionItemFactory,
  surveyItemFactory,
  surveyFactory,
  questionStatisticFactory
} from '../../../../factories';

chai.config.includeStack = true;

let company;
let team;

let survey1;
let survey2;
let survey3;

let question;
let questionItem1;
let questionItem2;
let questionItem3;

const email1 = 'test1@email.com';
const email2 = 'test2@email.com';
const password = 'qwe123qwe';

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  question = await questionFactory({ company, team, type: 'checkboxes' });

  [
    questionItem1,
    questionItem2,
    questionItem3,
  ] = await Promise.all([
    questionItemFactory({ company, team, question, sortableId: 0 }),
    questionItemFactory({ company, team, question, sortableId: 1 }),
    questionItemFactory({ company, team, question, sortableId: 2 })
  ]);

  [
    survey1,
    survey2,
    survey3
  ] = await Promise.all([
    surveyFactory({ company, team }),
    surveyFactory({ company, team }),
    surveyFactory({ company, team })
  ]);

  const [
    surveyItem1,
    surveyItem2,
    surveyItem3,
  ] = await Promise.all([
    surveyItemFactory({ company, team, question, type: 'trendQuestion', survey: survey1 }),
    surveyItemFactory({ company, team, question, type: 'trendQuestion', survey: survey2 }),
    surveyItemFactory({ company, team, question, type: 'trendQuestion', survey: survey3 })
  ]);

  const data = {
    [questionItem1._id]: 1,
    [questionItem2._id]: 1,
    [questionItem3._id]: 1
  };

  const time = moment().subtract(1, 'months');

  await Promise.all([
    questionStatisticFactory({ question, surveyItem: surveyItem1, data }),
    questionStatisticFactory({ question, surveyItem: surveyItem2, data }),
    questionStatisticFactory({ question, surveyItem: surveyItem3, data }),
    questionStatisticFactory({ question, surveyItem: surveyItem1, data, time }),
    questionStatisticFactory({ question, surveyItem: surveyItem2, data, time }),
    questionStatisticFactory({ question, surveyItem: surveyItem3, data, time })
  ]);

  await userFactory({
    password,
    company,
    currentTeam: team,
    email: email1,
    isPowerUser: true
  });

  const teamUser = await userFactory({
    password,
    company,
    email: email2,
    currentTeam: team
  });

  await teamUserFactory({ company, team, user: teamUser });
}

describe('## DELETE /api/v1/reports/question', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    const agent = request.agent(app);

    describe('by Power User', () => {
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email1,
            password
          });
      });

      it('should return trend question report', async () => {
        const res = await agent
          .get('/api/v1/reports/question')
          .query({
            questionId: question._id.toString(),
            range: { summary: true }
          })
          .expect(httpStatus.OK);

        expect(res.body.question._id).to.be.eq(question._id.toString());
        expect(res.body.data).to.be.an('array');
        expect(res.body.data.length).to.be.eq(4);

        const [
          data1,
          data2,
          data3,
          data4
        ] = res.body.data;

        expect(data1._id).to.be.eq(questionItem1._id.toString());
        expect(data1.value).to.be.eq(6);
        expect(data1.percent).to.be.eq('33.3');

        expect(data2._id).to.be.eq(questionItem2._id.toString());
        expect(data2.value).to.be.eq(6);
        expect(data2.percent).to.be.eq('33.3');

        expect(data3._id).to.be.eq(questionItem3._id.toString());
        expect(data3.value).to.be.eq(6);
        expect(data3.percent).to.be.eq('33.3');

        expect(data4._id).to.be.eq('customAnswer');
        expect(data4.value).to.be.eq(0);
        expect(data4.percent).to.be.eq('0.00');
      });

      it('should return trend question report filtered by surveys', async () => {
        const res = await agent
          .get('/api/v1/reports/question')
          .query({
            questionId: question._id.toString(),
            range: { summary: true },
            surveys: [
              survey1._id.toString(),
              survey2._id.toString()
            ]
          })
          .expect(httpStatus.OK);

        expect(res.body.question._id).to.be.eq(question._id.toString());
        expect(res.body.data).to.be.an('array');
        expect(res.body.data.length).to.be.eq(4);

        const [data1, data2, data3, data4] = res.body.data;

        expect(data1._id).to.be.eq(questionItem1._id.toString());
        expect(data1.value).to.be.eq(4);
        expect(data1.percent).to.be.eq('33.3');

        expect(data2._id).to.be.eq(questionItem2._id.toString());
        expect(data2.value).to.be.eq(4);
        expect(data2.percent).to.be.eq('33.3');

        expect(data3._id).to.be.eq(questionItem3._id.toString());
        expect(data3.value).to.be.eq(4);
        expect(data3.percent).to.be.eq('33.3');

        expect(data4._id).to.be.eq('customAnswer');
        expect(data4.value).to.be.eq(0);
        expect(data4.percent).to.be.eq('0.00');
      });

      it('should return trend question report filtered by range', async () => {
        const res = await agent
          .get('/api/v1/reports/question')
          .query({
            questionId: question._id.toString(),
            range: {
              summary: true,
              from: moment().subtract(1, 'week').toDate(),
              to: moment().toDate()
            },
            surveys: [
              survey1._id.toString(),
              survey2._id.toString()
            ]
          })
          .expect(httpStatus.OK);

        expect(res.body.question._id).to.be.eq(question._id.toString());
        expect(res.body.data).to.be.an('array');
        expect(res.body.data.length).to.be.eq(4);

        const [data1, data2, data3, data4] = res.body.data;

        expect(data1._id).to.be.eq(questionItem1._id.toString());
        expect(data1.value).to.be.eq(2);
        expect(data1.percent).to.be.eq('33.3');

        expect(data2._id).to.be.eq(questionItem2._id.toString());
        expect(data2.value).to.be.eq(2);
        expect(data2.percent).to.be.eq('33.3');

        expect(data3._id).to.be.eq(questionItem3._id.toString());
        expect(data3.value).to.be.eq(2);
        expect(data3.percent).to.be.eq('33.3');

        expect(data4._id).to.be.eq('customAnswer');
        expect(data4.value).to.be.eq(0);
        expect(data4.percent).to.be.eq('0.00');
      });
    });

    describe('by Team User', () => {
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should return trend question report', async () => {
        const res = await agent
          .get('/api/v1/reports/question')
          .query({
            questionId: question._id.toString(),
            range: { summary: true }
          })
          .expect(httpStatus.OK);

        expect(res.body.question._id).to.be.eq(question._id.toString());
        expect(res.body.data).to.be.an('array');
        expect(res.body.data.length).to.be.eq(4);

        const [
          data1,
          data2,
          data3,
          data4
        ] = res.body.data;

        expect(data1._id).to.be.eq(questionItem1._id.toString());
        expect(data1.value).to.be.eq(6);
        expect(data1.percent).to.be.eq('33.3');

        expect(data2._id).to.be.eq(questionItem2._id.toString());
        expect(data2.value).to.be.eq(6);
        expect(data2.percent).to.be.eq('33.3');

        expect(data3._id).to.be.eq(questionItem3._id.toString());
        expect(data3.value).to.be.eq(6);
        expect(data3.percent).to.be.eq('33.3');

        expect(data4._id).to.be.eq('customAnswer');
        expect(data4.value).to.be.eq(0);
        expect(data4.percent).to.be.eq('0.00');
      });

      it('should return trend question report filtered by surveys', async () => {
        const res = await agent
          .get('/api/v1/reports/question')
          .query({
            questionId: question._id.toString(),
            range: { summary: true },
            surveys: [
              survey1._id.toString(),
              survey2._id.toString()
            ]
          })
          .expect(httpStatus.OK);

        expect(res.body.question._id).to.be.eq(question._id.toString());
        expect(res.body.data).to.be.an('array');
        expect(res.body.data.length).to.be.eq(4);

        const [data1, data2, data3, data4] = res.body.data;

        expect(data1._id).to.be.eq(questionItem1._id.toString());
        expect(data1.value).to.be.eq(4);
        expect(data1.percent).to.be.eq('33.3');

        expect(data2._id).to.be.eq(questionItem2._id.toString());
        expect(data2.value).to.be.eq(4);
        expect(data2.percent).to.be.eq('33.3');

        expect(data3._id).to.be.eq(questionItem3._id.toString());
        expect(data3.value).to.be.eq(4);
        expect(data3.percent).to.be.eq('33.3');

        expect(data4._id).to.be.eq('customAnswer');
        expect(data4.value).to.be.eq(0);
        expect(data4.percent).to.be.eq('0.00');
      });

      it('should return trend question report filtered by range', async () => {
        const res = await agent
          .get('/api/v1/reports/question')
          .query({
            questionId: question._id.toString(),
            range: {
              summary: true,
              from: moment().subtract(1, 'week').toDate(),
              to: moment().toDate()
            },
            surveys: [
              survey1._id.toString(),
              survey2._id.toString()
            ]
          })
          .expect(httpStatus.OK);

        expect(res.body.question._id).to.be.eq(question._id.toString());
        expect(res.body.data).to.be.an('array');
        expect(res.body.data.length).to.be.eq(4);

        const [data1, data2, data3, data4] = res.body.data;

        expect(data1._id).to.be.eq(questionItem1._id.toString());
        expect(data1.value).to.be.eq(2);
        expect(data1.percent).to.be.eq('33.3');

        expect(data2._id).to.be.eq(questionItem2._id.toString());
        expect(data2.value).to.be.eq(2);
        expect(data2.percent).to.be.eq('33.3');

        expect(data3._id).to.be.eq(questionItem3._id.toString());
        expect(data3.value).to.be.eq(2);
        expect(data3.percent).to.be.eq('33.3');

        expect(data4._id).to.be.eq('customAnswer');
        expect(data4.value).to.be.eq(0);
        expect(data4.percent).to.be.eq('0.00');
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get('/api/v1/reports/question')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
