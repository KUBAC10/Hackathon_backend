import request from 'supertest';
import httpStatus from 'http-status';
import { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory,
  contentItemFactory,
  flowItemFactory,
  flowLogicFactory,
  gridColumnFactory,
  gridRowFactory,
  questionFactory,
  questionItemFactory,
  surveyFactory,
  surveyItemFactory,
  surveySectionFactory,
  teamFactory,
  teamUserFactory,
  userFactory
} from '../../../../factories';

const password = 'qwe123qwe';
const email = 'poweser@email.com';
const email2 = 'teamusser@email.com';

let company;
let team;
let survey;

async function makeTestData() {
  // create company
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create survey
  survey = await surveyFactory({ team, company });

  // create surveySection
  const surveySection = await surveySectionFactory({
    team,
    survey
  });

  // create questions
  const [
    question,
    questionTrend
  ] = await Promise.all([
    questionFactory({ team }),
    questionFactory({ team, trend: true })
  ]);

  // create questionItems rows and columns
  await Promise.all([
    questionItemFactory({ team, question }),
    questionItemFactory({ team, question: questionTrend }),
    gridRowFactory({ team, question }),
    gridRowFactory({ team, question: questionTrend }),
    gridColumnFactory({ team, question }),
    gridColumnFactory({ team, question: questionTrend })
  ]);

  // create surveyItems
  const [surveyItem] = await Promise.all([
    surveyItemFactory({
      team,
      survey,
      surveySection,
      question,
      sortableId: 0
    }),
    surveyItemFactory({
      team,
      survey,
      surveySection,
      question: questionTrend,
      sortableId: 1
    })
  ]);

  // create flow logic
  const flowLogic = await flowLogicFactory({
    team,
    company,
    surveyItem: surveyItem._id
  });

  // create flowItem
  await flowItemFactory({ team, company, flowLogic, survey });

  // create start end pages
  await Promise.all([
    contentItemFactory({ type: 'startPage', survey }),
    contentItemFactory({ type: 'endPage', survey }),
  ]);

  // create users
  let user = await userFactory({ email, password, currentTeam: team, company, isPowerUser: true });
  await teamUserFactory({ user, team, company });

  // create Team user
  user = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user, team, company });
}

describe('## GET /api/v1/drafts/:id', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('As Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email
          });
      });

      it('should return draft survey', async () => {
        const res = await agent
          .get(`/api/v1/drafts/${survey._id}`)
          .expect(httpStatus.OK);

        const [surveySection] = res.body.surveySections;
        const [startPage] = res.body.startPages;
        const [endPage] = res.body.endPages;
        const [surveyItem1, surveyItem2] = surveySection.surveyItems;
        const [flowLogic] = surveyItem1.flowLogic;
        const [questionItem] = surveyItem1.question.questionItems;
        const [gridRow] = surveyItem1.question.gridRows;
        const [gridColumn] = surveyItem1.question.gridColumns;

        expect(res.body).to.be.an('object');
        expect(surveySection).to.be.an('object');
        expect(startPage).to.be.an('object');
        expect(endPage).to.be.an('object');
        expect(surveyItem1).to.be.an('object');
        expect(surveyItem2).to.be.an('object');
        expect(surveyItem1.question).to.be.an('object');
        expect(surveyItem2.question).to.be.an('object');
        expect(questionItem).to.be.an('object');
        expect(gridRow).to.be.an('object');
        expect(gridColumn).to.be.an('object');
        expect(flowLogic).to.be.an('object');
        expect(flowLogic.flowItems.length).to.be.eq(1);
      });

      it('should return error if survey hasn\'t exist', async () => {
        await agent
          .get(`/api/v1/drafts/${company._id}`)
          .expect(httpStatus.NOT_FOUND);
      });

      it('should return error if user hasn\'t permission', async () => {
        const survey = await surveyFactory({});

        await agent
          .get(`/api/v1/drafts/${survey._id}`)
          .expect(httpStatus.FORBIDDEN);
      });

      xit('should return draft survey without draft removed sections', async () => {

      });

      xit('should return draft survey without draft removed questions', async () => {

      });

      xit('should return draft survey without draft removed contentItem startPage', async () => {

      });

      xit('should return draft survey without draft removed contentItem endPage', async () => {

      });

      xit('should return draft survey without draft removed contentItem (surveyItem)', async () => {

      });
    });

    describe('As Team User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email2
          });
      });

      it('should return draft survey', async () => {
        const res = await agent
          .get(`/api/v1/drafts/${survey._id}`)
          .expect(httpStatus.OK);

        const [surveySection] = res.body.surveySections;
        const [startPage] = res.body.startPages;
        const [endPage] = res.body.endPages;
        const [surveyItem1, surveyItem2] = surveySection.surveyItems;
        const [flowLogic] = surveyItem1.flowLogic;
        const [questionItem] = surveyItem1.question.questionItems;
        const [gridRow] = surveyItem1.question.gridRows;
        const [gridColumn] = surveyItem1.question.gridColumns;

        expect(res.body).to.be.an('object');
        expect(surveySection).to.be.an('object');
        expect(startPage).to.be.an('object');
        expect(endPage).to.be.an('object');
        expect(surveyItem1).to.be.an('object');
        expect(surveyItem2).to.be.an('object');
        expect(surveyItem1.question).to.be.an('object');
        expect(surveyItem2.question).to.be.an('object');
        expect(questionItem).to.be.an('object');
        expect(gridRow).to.be.an('object');
        expect(gridColumn).to.be.an('object');
        expect(flowLogic).to.be.an('object');
        expect(flowLogic.flowItems.length).to.be.eq(1);
      });

      it('should return error if survey hasn\'t exist', async () => {
        await agent
          .get(`/api/v1/drafts/${company._id}`)
          .expect(httpStatus.NOT_FOUND);
      });

      it('should return error if user hasn\'t permission', async () => {
        const survey = await surveyFactory({});

        await agent
          .get(`/api/v1/drafts/${survey._id}`)
          .expect(httpStatus.FORBIDDEN);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return Unauthorized stats', async () => {
      await request.agent(app)
        .get(`/api/v1/drafts/${survey._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
