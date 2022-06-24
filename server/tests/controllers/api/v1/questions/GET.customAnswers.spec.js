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
  surveyItemFactory,
  surveyFactory, surveyResultFactory,
} from '../../../../factories';

chai.config.includeStack = true;

let company;
let team;

let survey1;
let survey2;
let survey3;

let question1;
let question2;

const email1 = 'test1@email.com';
const email2 = 'test2@email.com';
const password = 'qwe123qwe';

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  [
    question1,
    question2
  ] = await Promise.all([
    questionFactory({ company, team, type: 'dropdown' }),
    questionFactory({ company, team, type: 'netPromoterScore' })
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
    surveyItem4,
    surveyItem5,
    surveyItem6
  ] = await Promise.all([
    surveyItemFactory({ company, team, question: question1, type: 'trendQuestion', survey: survey1 }),
    surveyItemFactory({ company, team, question: question1, type: 'trendQuestion', survey: survey2 }),
    surveyItemFactory({ company, team, question: question1, type: 'trendQuestion', survey: survey3 }),
    surveyItemFactory({ company, team, question: question2, type: 'trendQuestion', survey: survey1 }),
    surveyItemFactory({ company, team, question: question2, type: 'trendQuestion', survey: survey2 }),
    surveyItemFactory({ company, team, question: question2, type: 'trendQuestion', survey: survey3 }),
  ]);

  const createdAt = moment().subtract(1, 'months');

  await Promise.all([
    surveyResultFactory({
      company,
      team,
      empty: false,
      survey: survey1,
      answer: {
        [surveyItem1._id]: { customAnswer: 'customAnswerText' },
        [surveyItem4._id]: { value: 10, customAnswer: 'customAnswerText' }
      }
    }),
    surveyResultFactory({
      company,
      team,
      empty: false,
      survey: survey2,
      answer: {
        [surveyItem2._id]: { customAnswer: 'customAnswerText' },
        [surveyItem5._id]: { value: 10, customAnswer: 'customAnswerText' }
      }
    }),
    surveyResultFactory({
      company,
      team,
      empty: false,
      survey: survey3,
      answer: {
        [surveyItem3._id]: { customAnswer: 'customAnswerText' },
        [surveyItem6._id]: { value: 10, customAnswer: 'customAnswerText' }
      }
    }),
    surveyResultFactory({
      createdAt,
      company,
      team,
      empty: false,
      survey: survey1,
      answer: {
        [surveyItem1._id]: { customAnswer: 'customAnswerText' },
        [surveyItem4._id]: { value: 10, customAnswer: 'customAnswerText' }
      }
    }),
    surveyResultFactory({
      createdAt,
      company,
      team,
      empty: false,
      survey: survey2,
      answer: {
        [surveyItem2._id]: { customAnswer: 'customAnswerText' },
        [surveyItem5._id]: { value: 10, customAnswer: 'customAnswerText' }
      }
    }),
    surveyResultFactory({
      createdAt,
      company,
      team,
      empty: false,
      survey: survey3,
      answer: {
        [surveyItem3._id]: { customAnswer: 'customAnswerText' },
        [surveyItem6._id]: { value: 10, customAnswer: 'customAnswerText' }
      }
    })
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

describe('## DELETE /api/v1/questions/:id/report', () => {
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

      it('should return list of custom answers', async () => {
        const res = await agent
          .get(`/api/v1/questions/${question1._id}/custom-answers`)
          .expect(httpStatus.OK);

        expect(res.body.resources).to.be.an('array');
        expect(res.body.resources.length).to.be.eq(6);
        expect(res.body.total).to.be.eq(6);

        res.body.resources.forEach((i) => {
          expect(i.customAnswer).to.be.eq('customAnswerText');
        });
      });

      it('should return list of custom answers filtered by surveys', async () => {
        const res = await agent
          .get(`/api/v1/questions/${question1._id}/custom-answers`)
          .query({
            surveys: [
              survey1._id.toString(),
              survey2._id.toString()
            ]
          })
          .expect(httpStatus.OK);

        expect(res.body.resources).to.be.an('array');
        expect(res.body.resources.length).to.be.eq(4);
        expect(res.body.total).to.be.eq(4);

        res.body.resources.forEach((i) => {
          expect(i.customAnswer).to.be.eq('customAnswerText');
        });
      });

      it('should return list of text comments', async () => {
        const res = await agent
          .get(`/api/v1/questions/${question2._id}/custom-answers`)
          .expect(httpStatus.OK);

        expect(res.body.resources).to.be.an('array');
        expect(res.body.resources.length).to.be.eq(6);
        expect(res.body.total).to.be.eq(6);

        res.body.resources.forEach((i) => {
          expect(i.customAnswer).to.be.eq('customAnswerText');
          expect(i.value).to.be.eq(10);
        });
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

      it('should return list of custom answers', async () => {
        const res = await agent
          .get(`/api/v1/questions/${question1._id}/custom-answers`)
          .expect(httpStatus.OK);

        expect(res.body.resources).to.be.an('array');
        expect(res.body.resources.length).to.be.eq(6);
        expect(res.body.total).to.be.eq(6);

        res.body.resources.forEach((i) => {
          expect(i.customAnswer).to.be.eq('customAnswerText');
        });
      });

      it('should return list of custom answers filtered by surveys', async () => {
        const res = await agent
          .get(`/api/v1/questions/${question1._id}/custom-answers`)
          .query({
            surveys: [
              survey1._id.toString(),
              survey2._id.toString()
            ]
          })
          .expect(httpStatus.OK);

        expect(res.body.resources).to.be.an('array');
        expect(res.body.resources.length).to.be.eq(4);
        expect(res.body.total).to.be.eq(4);

        res.body.resources.forEach((i) => {
          expect(i.customAnswer).to.be.eq('customAnswerText');
        });
      });

      it('should return list of text comments', async () => {
        const res = await agent
          .get(`/api/v1/questions/${question2._id}/custom-answers`)
          .expect(httpStatus.OK);

        expect(res.body.resources).to.be.an('array');
        expect(res.body.resources.length).to.be.eq(6);
        expect(res.body.total).to.be.eq(6);

        res.body.resources.forEach((i) => {
          expect(i.customAnswer).to.be.eq('customAnswerText');
          expect(i.value).to.be.eq(10);
        });
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get(`/api/v1/questions/${company._id}/custom-answers`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
