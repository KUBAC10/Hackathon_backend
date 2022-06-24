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
  teamUserFactory,
  surveySectionFactory,
  questionFactory,
  surveyItemFactory,
  surveyResultFactory,
  contactFactory,
} from '../../../../factories';

chai.config.includeStack = true;

const password = 'password';
const email1 = 'test1@email.com';
const email2 = 'test2@email.com';

let survey;
let contact;
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

  contact = await contactFactory();

  // create survey results
  await Promise.all([
    surveyResultFactory({
      survey,
      empty: false,
      createdAt: moment().subtract(10, 'days').toDate(),
      answer: {
        [surveyItem1._id]: { value: 0, customAnswer: 'customAnswer1' },
        [surveyItem2._id]: { value: 1, customAnswer: 'customAnswer2' },
        [surveyItem3._id]: { value: 2, customAnswer: 'customAnswer3' }
      }
    }),
    surveyResultFactory({
      survey,
      empty: false,
      answer: {
        [surveyItem1._id]: { value: 3, customAnswer: 'customAnswer4' },
        [surveyItem2._id]: { value: 4, customAnswer: 'customAnswer5' },
        [surveyItem3._id]: { value: 5, customAnswer: 'customAnswer6' }
      }
    }),
    surveyResultFactory({
      survey,
      empty: false,
      answer: {
        [surveyItem1._id]: { value: 6, customAnswer: 'customAnswer7' },
        [surveyItem2._id]: { value: 7, customAnswer: 'customAnswer8' },
        [surveyItem3._id]: { value: 8, customAnswer: 'customAnswer9' }
      }
    }),
    surveyResultFactory({
      survey,
      contact,
      empty: false,
      answer: {
        [surveyItem1._id]: { value: 9, customAnswer: 'customAnswer10' },
        [surveyItem2._id]: { value: 10, customAnswer: 'customAnswer11' },
        [surveyItem3._id]: { value: 0, customAnswer: 'customAnswer12' }
      }
    })
  ]);

  // create Power user
  await userFactory({ email: email1, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('/api/v1/advanced-analyze/surveys/:id/nps-comments', () => {
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

      it('should return overall nps comments', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/nps-comments`)
          .query({ limit: 10 })
          .expect(httpStatus.OK);

        const { resources, total } = res.body;

        expect(resources.length).to.be.eq(10);
        expect(total).to.be.eq(12);

        const [
          item1,
          item2
        ] = resources;

        expect(item1.value).to.be.eq(10);
        expect(item1.customAnswer).to.be.eq('customAnswer11');
        expect(item1.surveyItem._id.toString()).to.be.eq(surveyItem2._id.toString());
        expect(item1.contact._id.toString()).to.be.eq(contact._id.toString());

        expect(item2.value).to.be.eq(9);
        expect(item2.customAnswer).to.be.eq('customAnswer10');
        expect(item2.surveyItem._id.toString()).to.be.eq(surveyItem1._id.toString());
      });

      it('should return overall question comments by range', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/nps-comments`)
          .query({
            from: moment().subtract(7, 'days').toDate(),
            to: moment().toDate()
          })
          .expect(httpStatus.OK);

        const { resources, total } = res.body;

        expect(resources.length).to.be.eq(9);
        expect(total).to.be.eq(9);

        const [
          item1,
          item2
        ] = resources;

        expect(item1.value).to.be.eq(10);
        expect(item1.customAnswer).to.be.eq('customAnswer11');
        expect(item1.surveyItem._id.toString()).to.be.eq(surveyItem2._id.toString());
        expect(item1.contact._id.toString()).to.be.eq(contact._id.toString());

        expect(item2.value).to.be.eq(9);
        expect(item2.customAnswer).to.be.eq('customAnswer10');
        expect(item2.surveyItem._id.toString()).to.be.eq(surveyItem1._id.toString());
      });

      it('should return nps comments by one question', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/nps-comments`)
          .query({
            surveyItems: surveyItem1._id.toString()
          })
          .expect(httpStatus.OK);

        const { resources, total } = res.body;

        expect(resources.length).to.be.eq(4);
        expect(total).to.be.eq(4);

        const [
          item1,
          item2
        ] = resources;

        expect(item1.value).to.be.eq(9);
        expect(item1.customAnswer).to.be.eq('customAnswer10');
        expect(item1.surveyItem._id.toString()).to.be.eq(surveyItem1._id.toString());
        expect(item1.contact._id.toString()).to.be.eq(contact._id.toString());

        expect(item2.value).to.be.eq(6);
        expect(item2.customAnswer).to.be.eq('customAnswer7');
        expect(item2.surveyItem._id.toString()).to.be.eq(surveyItem1._id.toString());
      });

      it('should return overall question comments filtered by value', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/nps-comments`)
          .query({
            value: 0
          })
          .expect(httpStatus.OK);

        const { resources, total } = res.body;

        expect(resources.length).to.be.eq(2);
        expect(total).to.be.eq(2);

        expect(resources.every(r => r.value === 0)).to.be.eq(true);
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

      it('should return overall nps comments', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/nps-comments`)
          .query({ limit: 10 })
          .expect(httpStatus.OK);

        const { resources, total } = res.body;

        expect(resources.length).to.be.eq(10);
        expect(total).to.be.eq(12);

        const [
          item1,
          item2
        ] = resources;

        expect(item1.value).to.be.eq(10);
        expect(item1.customAnswer).to.be.eq('customAnswer11');
        expect(item1.surveyItem._id.toString()).to.be.eq(surveyItem2._id.toString());
        expect(item1.contact._id.toString()).to.be.eq(contact._id.toString());

        expect(item2.value).to.be.eq(9);
        expect(item2.customAnswer).to.be.eq('customAnswer10');
        expect(item2.surveyItem._id.toString()).to.be.eq(surveyItem1._id.toString());
      });

      it('should return overall question comments by range', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/nps-comments`)
          .query({
            from: moment().subtract(7, 'days').toDate(),
            to: moment().toDate()
          })
          .expect(httpStatus.OK);

        const { resources, total } = res.body;

        expect(resources.length).to.be.eq(9);
        expect(total).to.be.eq(9);

        const [
          item1,
          item2
        ] = resources;

        expect(item1.value).to.be.eq(10);
        expect(item1.customAnswer).to.be.eq('customAnswer11');
        expect(item1.surveyItem._id.toString()).to.be.eq(surveyItem2._id.toString());
        expect(item1.contact._id.toString()).to.be.eq(contact._id.toString());

        expect(item2.value).to.be.eq(9);
        expect(item2.customAnswer).to.be.eq('customAnswer10');
        expect(item2.surveyItem._id.toString()).to.be.eq(surveyItem1._id.toString());
      });

      it('should return nps comments by one question', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/nps-comments`)
          .query({
            surveyItems: surveyItem1._id.toString()
          })
          .expect(httpStatus.OK);

        const { resources, total } = res.body;

        expect(resources.length).to.be.eq(4);
        expect(total).to.be.eq(4);

        const [
          item1,
          item2
        ] = resources;

        expect(item1.value).to.be.eq(9);
        expect(item1.customAnswer).to.be.eq('customAnswer10');
        expect(item1.surveyItem._id.toString()).to.be.eq(surveyItem1._id.toString());
        expect(item1.contact._id.toString()).to.be.eq(contact._id.toString());

        expect(item2.value).to.be.eq(6);
        expect(item2.customAnswer).to.be.eq('customAnswer7');
        expect(item2.surveyItem._id.toString()).to.be.eq(surveyItem1._id.toString());
      });

      it('should return overall question comments filtered by value', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/nps-comments`)
          .query({
            value: 0
          })
          .expect(httpStatus.OK);

        const { resources, total } = res.body;

        expect(resources.length).to.be.eq(2);
        expect(total).to.be.eq(2);

        expect(resources.every(r => r.value === 0)).to.be.eq(true);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return unauthorized status', async () => {
      await request(app)
        .get(`/api/v1/advanced-analyze/surveys/${survey._id}/nps-comments`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
