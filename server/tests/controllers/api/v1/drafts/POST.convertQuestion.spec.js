import request from 'supertest';
import httpStatus from 'http-status';
import { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory,
  flowItemFactory,
  flowLogicFactory,
  questionFactory,
  questionItemFactory,
  surveyItemFactory,
  teamFactory,
  teamUserFactory,
  userFactory
} from '../../../../factories';

const password = 'qwe123qwe';
const email = 'poweser@email.com';
const email2 = 'teamusser@email.com';

let company;
let team;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({});

  // create users
  let user = await userFactory({ email, password, currentTeam: team, company, isPowerUser: true });
  await teamUserFactory({ user, team, company });

  // create Team user
  user = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user, team, company });
}

describe('## POST /api/v1/drafts/convert-question', () => {
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

      it('should convert trend question', async () => {
        const question = await questionFactory({ team, company, trend: true, type: 'dropdown' });
        const surveyItem = await surveyItemFactory({ team, company, question, type: 'trendQuestion' });
        const questionItem = await questionItemFactory({ team, company, question });
        const flowLogic = await flowLogicFactory({ team, company, surveyItem });
        await flowItemFactory({
          team,
          company,
          flowLogic,
          questionItems: [questionItem._id],
          questionType: 'dropdown'
        });

        const res = await agent
          .post('/api/v1/drafts/convert-question')
          .send({
            surveyItemId: surveyItem._id
          })
          .expect(httpStatus.OK);

        expect(res.body.type).to.be.eq('question');
        expect(res.body.question.toString()).to.not.eq(question._id.toString());
        expect(res.body.question.questionItems[0]._id.toString())
          .to.not.eq(questionItem._id.toString());
        expect(res.body.flowLogic[0].flowItems[0].questionItems[0].toString())
          .to.not.eq(questionItem._id.toString());
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

      it('should convert trend question', async () => {
        const question = await questionFactory({ team, company, trend: true, type: 'dropdown' });
        const surveyItem = await surveyItemFactory({ team, company, question, type: 'trendQuestion' });
        const questionItem = await questionItemFactory({ team, company, question });
        const flowLogic = await flowLogicFactory({ team, company, surveyItem });
        await flowItemFactory({
          team,
          company,
          flowLogic,
          questionItems: [questionItem._id],
          questionType: 'dropdown'
        });

        const res = await agent
          .post('/api/v1/drafts/convert-question')
          .send({
            surveyItemId: surveyItem._id
          })
          .expect(httpStatus.OK);

        expect(res.body.type).to.be.eq('question');
        expect(res.body.question.toString()).to.not.eq(question._id.toString());
        expect(res.body.question.questionItems[0]._id.toString())
          .to.not.eq(questionItem._id.toString());
        expect(res.body.flowLogic[0].flowItems[0].questionItems[0].toString())
          .to.not.eq(questionItem._id.toString());
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post('/api/v1/drafts/convert-question')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
