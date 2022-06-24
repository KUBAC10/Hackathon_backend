import request from 'supertest';
import httpStatus from 'http-status';
import chai from 'chai';
import app from 'index';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

// factories
import {
  companyFactory,
  contentItemFactory,
  flowItemFactory,
  flowLogicFactory,
  questionFactory,
  surveyFactory,
  surveyItemFactory,
  surveySectionFactory,
  teamFactory,
  teamUserFactory,
  userFactory,
  questionItemFactory, surveyThemeFactory
} from '../../../../factories';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'poweser@email.com';
const email2 = 'teamusser@email.com';

let team;
let company;
let survey;
let powerUser;
let teamUser;

async function makeTestData() {
  // create company
  company = await companyFactory({});
  team = await teamFactory({ company });

  survey = await surveyFactory({ team, company });

  const surveySection = await surveySectionFactory({ company, team, survey });

  const [
    question,
    questionTrend
  ] = await Promise.all([
    questionFactory({ company, team, type: 'dropdown' }),
    questionFactory({ company, team, trend: true, general: true })
  ]);

  await questionItemFactory({ company, team, question });

  const [
    surveyItem1,
    surveyItem2,
    surveyItem3
  ] = await Promise.all([
    surveyItemFactory({ company, team, survey, surveySection, question, sortableId: 0 }),
    surveyItemFactory({ company, team, survey, surveySection, question: questionTrend, type: 'trendQuestion', sortableId: 1 }),
    surveyItemFactory({ company, team, survey, surveySection, type: 'contents', sortableId: 2 })
  ]);

  const [endPage] = await Promise.all([
    contentItemFactory({ company, team, survey, type: 'endPage' }),
    contentItemFactory({ company, team, survey, type: 'startPage' }),
    contentItemFactory({ company, team, survey, surveyItem: surveyItem3 })
  ]);

  const flowLogic = await flowLogicFactory({ company, team, surveyItem: surveyItem2 });

  await Promise.all([
    flowItemFactory({ company, team, survey, surveyItem: surveyItem1, flowLogic }),
    flowItemFactory({ company, team, survey, endPage, questionType: 'endPage' })
  ]);

  await surveyThemeFactory({ company, team, survey, type: 'survey' });

  // create users
  powerUser = await userFactory({ email, password, currentTeam: team, company, isPowerUser: true });
  await teamUserFactory({ user: powerUser, team, company });

  // create Team user
  teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('## GET /api/v1/surveys/:id/download-survey-json', () => {
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

      it('should return not found because survey not exist', async () => {
        await agent
          .get(`/api/v1/surveys/${team._id}/download-json`)
          .expect(httpStatus.NOT_FOUND);
      });

      it('should return survey json', async () => {
        await agent
          .get(`/api/v1/surveys/${survey._id}/download-json`)
          .expect(httpStatus.OK);
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

      it('should return not found because survey not exist', async () => {
        await agent
          .get(`/api/v1/surveys/${team._id}/download-json`)
          .expect(httpStatus.NOT_FOUND);
      });

      it('should return survey json', async () => {
        await agent
          .get(`/api/v1/surveys/${survey._id}/download-json`)
          .expect(httpStatus.OK);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get(`/api/v1/surveys/${team._id}/download-json`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
