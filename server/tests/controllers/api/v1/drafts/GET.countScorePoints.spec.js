import request from 'supertest';
import httpStatus from 'http-status';
import { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory,
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
    questionFactory({ team, type: 'thumbs', scoreObj: { yes: 2, no: 1 } }),
    questionFactory({ team, type: 'dropdown', trend: true })
  ]);

  // create questionItems rows and columns
  await Promise.all([
    questionItemFactory({ team, question: questionTrend, score: 1 }),
    questionItemFactory({ team, question: questionTrend, score: 1 }),
  ]);

  // create surveyItems
  await Promise.all([
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

  // create users
  let user = await userFactory({ email, password, currentTeam: team, company, isPowerUser: true });
  await teamUserFactory({ user, team, company });

  // create Team user
  user = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user, team, company });
}

describe('## GET /api/v1/drafts/count-score/:id - count maximum score', () => {
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

      it('should return count of score points by survey', async () => {
        const res = await agent
          .get(`/api/v1/drafts/count-score/${survey._id}`)
          .expect(httpStatus.OK);

        expect(res.body.overallScore).to.be.eq(3);
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

      it('should return count of score points by survey', async () => {
        const res = await agent
          .get(`/api/v1/drafts/count-score/${survey._id}`)
          .expect(httpStatus.OK);

        expect(res.body.overallScore).to.be.eq(3);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return Unauthorized stats', async () => {
      await request.agent(app)
        .get(`/api/v1/drafts/count-score/${survey._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
