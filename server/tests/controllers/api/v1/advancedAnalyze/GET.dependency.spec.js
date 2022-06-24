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
  surveyResultFactory,
  teamUserFactory,
  surveySectionFactory,
  surveyItemFactory,
  questionFactory,
  questionItemFactory
} from '../../../../factories';

chai.config.includeStack = true;

const password = 'password';
const email1 = 'test1@email.com';
const email2 = 'test2@email.com';

let survey;
let company;
let team;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  survey = await surveyFactory({ company, team });

  const surveySection = await surveySectionFactory({ company, team, survey });

  const [
    question1,
    question2,
    question3,
    question4
  ] = await Promise.all([
    questionFactory({ company, team, type: 'slider' }),
    questionFactory({ company, team, type: 'slider' }),
    questionFactory({ company, team, type: 'slider' }),
    questionFactory({ company, team, type: 'checkboxes' })
  ]);

  const [
    questionItem1,
    questionItem2
  ] = await Promise.all([
    questionItemFactory({ company, team, question: question4 }),
    questionItemFactory({ company, team, question: question4 })
  ]);

  const now = Date.now();

  const [
    surveyItem1,
    surveyItem2,
    surveyItem3,
    surveyItem4
  ] = await Promise.all([
    surveyItemFactory({
      company,
      team,
      survey,
      surveySection,
      question: question1,
      createdAt: now
    }),
    surveyItemFactory({
      company,
      team,
      survey,
      surveySection,
      question: question2,
      createdAt: now + 1
    }),
    surveyItemFactory({
      company,
      team,
      survey,
      surveySection,
      question: question3,
      createdAt: now + 2
    }),
    surveyItemFactory({
      company,
      team,
      survey,
      surveySection,
      question: question4,
      createdAt: now + 3
    })
  ]);

  // create survey results
  await Promise.all([
    surveyResultFactory({
      survey,
      empty: false,
      answer: {
        [surveyItem1._id]: { value: 100 },
        [surveyItem2._id]: { value: 43 },
        [surveyItem3._id]: { value: 23 },
        [surveyItem4._id]: { questionItems: [questionItem1._id.toString()] }
      }
    }),
    surveyResultFactory({
      survey,
      empty: false,
      answer: {
        [surveyItem1._id]: { value: 99 },
        [surveyItem2._id]: { value: 65 },
        [surveyItem3._id]: { value: 22 },
        [surveyItem4._id]: { questionItems: [questionItem2._id.toString()] }
      }
    }),
    surveyResultFactory({
      survey,
      empty: false,
      answer: {
        [surveyItem1._id]: { value: 101 },
        [surveyItem2._id]: { value: 34 },
        [surveyItem3._id]: { value: 24 },
        [surveyItem4._id]: { questionItems: [questionItem1._id.toString()] }
      }
    }),
    surveyResultFactory({
      survey,
      empty: false,
      answer: {
        [surveyItem1._id]: { value: 100 },
        [surveyItem2._id]: { value: 43 },
        [surveyItem3._id]: { value: 23 },
        [surveyItem4._id]: { questionItems: [questionItem1._id.toString()] }
      }
    }),
    surveyResultFactory({
      survey,
      empty: false,
      answer: {
        [surveyItem1._id]: { value: 99 },
        [surveyItem2._id]: { value: 65 },
        [surveyItem3._id]: { value: 22 },
        [surveyItem4._id]: { questionItems: [questionItem2._id.toString()] }
      }
    }),
    surveyResultFactory({
      survey,
      empty: false,
      answer: {
        [surveyItem1._id]: { value: 101 },
        [surveyItem2._id]: { value: 34 },
        [surveyItem3._id]: { value: 24 },
        [surveyItem4._id]: { questionItems: [questionItem1._id.toString()] }
      }
    }),
    surveyResultFactory({
      survey,
      empty: false,
      answer: {
        [surveyItem1._id]: { value: 100 },
        [surveyItem2._id]: { value: 43 },
        [surveyItem3._id]: { value: 23 },
        [surveyItem4._id]: { questionItems: [questionItem1._id.toString()] }
      }
    }),
    surveyResultFactory({
      survey,
      empty: false,
      answer: {
        [surveyItem1._id]: { value: 99 },
        [surveyItem2._id]: { value: 65 },
        [surveyItem3._id]: { value: 22 },
        [surveyItem4._id]: { questionItems: [questionItem2._id.toString()] }
      }
    }),
    surveyResultFactory({
      survey,
      empty: false,
      answer: {
        [surveyItem1._id]: { value: 101 },
        [surveyItem2._id]: { value: 34 },
        [surveyItem3._id]: { value: 24 },
        [surveyItem4._id]: { questionItems: [questionItem1._id.toString()] }
      }
    }),
    surveyResultFactory({
      survey,
      empty: false,
      answer: {
        [surveyItem1._id]: { value: 100 },
        [surveyItem2._id]: { value: 43 },
        [surveyItem3._id]: { value: 23 },
        [surveyItem4._id]: { questionItems: [questionItem1._id.toString()] }
      }
    }),
    surveyResultFactory({
      survey,
      empty: false,
      answer: {
        [surveyItem1._id]: { value: 99 },
        [surveyItem2._id]: { value: 65 },
        [surveyItem3._id]: { value: 22 },
        [surveyItem4._id]: { questionItems: [questionItem2._id.toString()] }
      }
    }),
    surveyResultFactory({
      survey,
      empty: false,
      answer: {
        [surveyItem1._id]: { value: 101 },
        [surveyItem2._id]: { value: 34 },
        [surveyItem3._id]: { value: 24 },
        [surveyItem4._id]: { questionItems: [questionItem1._id.toString()] }
      }
    })
  ]);

  // create Power user
  await userFactory({ email: email1, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('GET /api/v1/advanced-analyze/surveys/:id/dependency', () => {
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

      it('should return all dependencies data', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/dependency`)
          .expect(httpStatus.OK);

        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.eq(9);

        const [
          entity1,
          entity2,
          entity3,
        ] = res.body;

        expect(entity1.correlation).to.be.eq('1.00');
        expect(entity2.correlation).to.be.eq('-0.972');
        expect(entity3.correlation).to.be.eq('-0.972');
      });

      it('should return positive dependencies data', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/dependency`)
          .query({ correlationDirection: 'positive' })
          .expect(httpStatus.OK);

        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.eq(4);

        const [
          entity1,
          entity2,
          entity3,
        ] = res.body;

        expect(entity1.correlation).to.be.eq('1.00');
        expect(entity2.correlation).to.be.eq('0.959');
        expect(entity3.correlation).to.be.eq('0.866');
      });

      it('should return negative dependencies data', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/dependency`)
          .query({ correlationDirection: 'negative' })
          .expect(httpStatus.OK);

        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.eq(5);

        const [
          entity1,
          entity2,
          entity3,
        ] = res.body;

        expect(entity1.correlation).to.be.eq('-0.972');
        expect(entity2.correlation).to.be.eq('-0.972');
        expect(entity3.correlation).to.be.eq('-0.959');
      });

      it('should return status not found', async () => {
        await agent
          .get(`/api/v1/advanced-analyze/surveys/${company._id}/dependency`)
          .expect(httpStatus.NOT_FOUND);
      });

      it('should return status forbidden', async () => {
        const fakeSurvey = await surveyFactory({});

        await agent
          .get(`/api/v1/advanced-analyze/surveys/${fakeSurvey._id}/replies`)
          .expect(httpStatus.FORBIDDEN);
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

      it('should return all dependencies data', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/dependency`)
          .expect(httpStatus.OK);

        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.eq(9);

        const [
          entity1,
          entity2,
          entity3,
        ] = res.body;

        expect(entity1.correlation).to.be.eq('1.00');
        expect(entity2.correlation).to.be.eq('-0.972');
        expect(entity3.correlation).to.be.eq('-0.972');
      });

      it('should return positive dependencies data', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/dependency`)
          .query({ correlationDirection: 'positive' })
          .expect(httpStatus.OK);

        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.eq(4);

        const [
          entity1,
          entity2,
          entity3,
        ] = res.body;

        expect(entity1.correlation).to.be.eq('1.00');
        expect(entity2.correlation).to.be.eq('0.959');
        expect(entity3.correlation).to.be.eq('0.866');
      });

      it('should return negative dependencies data', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/dependency`)
          .query({ correlationDirection: 'negative' })
          .expect(httpStatus.OK);

        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.eq(5);

        const [
          entity1,
          entity2,
          entity3,
        ] = res.body;

        expect(entity1.correlation).to.be.eq('-0.972');
        expect(entity2.correlation).to.be.eq('-0.972');
        expect(entity3.correlation).to.be.eq('-0.959');
      });

      it('should return status not found', async () => {
        await agent
          .get(`/api/v1/advanced-analyze/surveys/${company._id}/dependency`)
          .expect(httpStatus.NOT_FOUND);
      });

      it('should return status forbidden', async () => {
        const fakeSurvey = await surveyFactory({});

        await agent
          .get(`/api/v1/advanced-analyze/surveys/${fakeSurvey._id}/replies`)
          .expect(httpStatus.FORBIDDEN);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return unauthorized status', async () => {
      await request.agent(app)
        .get(`/api/v1/advanced-analyze/surveys/${survey._id}/dependency`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
