import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

// factories
import {
  companyFactory,
  teamFactory,
  teamUserFactory,
  userFactory
} from '../../../../factories';
import loadSurveyDoc from '../../../../../controllers/helpers/loadSurveyDoc';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'poweser@email.com';
const email2 = 'teamusser@email.com';

let team;
let company;
let powerUser;
let teamUser;

async function makeTestData() {
  // create company
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create users
  powerUser = await userFactory({ email, password, currentTeam: team, company, isPowerUser: true });
  await teamUserFactory({ user: powerUser, team, company });

  // create Team user
  teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('## POST /api/v1/surveys/import/json', () => {
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

      it('should return error', async () => {
        await agent
          .post('/api/v1/surveys/upload-json')
          .attach('json', 'server/tests/testImportJSON.notjson')
          .expect(httpStatus.UNPROCESSABLE_ENTITY);
      });

      it('should create survey', async () => {
        const res = await agent
          .post('/api/v1/surveys/upload-json')
          .attach('json', 'server/tests/testImportJSON.json')
          .expect(httpStatus.OK);

        const surveyId = res.body;

        // load Survey
        const survey = await loadSurveyDoc({ _id: surveyId });

        const {
          startPages,
          endPages,
          surveySections,
          surveyTheme,
          ...reloadSurvey
        } = survey;

        expect(startPages.length).to.be.eq(1);
        expect(endPages.length).to.be.eq(1);
        expect(endPages[0].flowItem).to.be.an('object');
        expect(surveyTheme).to.be.an('object');
        expect(reloadSurvey).to.be.an('object');

        expect(surveySections.length).to.be.eq(1);

        const [section1] = surveySections;

        expect(section1.surveyItems.length).to.be.eq(3);

        const [
          surveyItem1,
          surveyItem2,
          surveyItem3
        ] = section1.surveyItems;

        expect(surveyItem1.type).to.be.eq('question');
        expect(surveyItem1.question).to.be.an('object');
        expect(surveyItem1.question.questionItems.length).to.be.eq(1);
        expect(surveyItem2.type).to.be.eq('question');
        expect(surveyItem2.question).to.be.an('object');
        expect(surveyItem2.flowLogic.length).to.be.eq(1);
        expect(surveyItem2.flowLogic[0].flowItems.length).to.be.eq(1);
        expect(surveyItem3.type).to.be.eq('contents');
        expect(surveyItem3.contents.length).to.be.eq(1);
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

      it('should return error', async () => {
        await agent
          .post('/api/v1/surveys/upload-json')
          .attach('json', 'server/tests/testImportJSON.notjson')
          .expect(httpStatus.UNPROCESSABLE_ENTITY);
      });

      it('should create survey', async () => {
        const res = await agent
          .post('/api/v1/surveys/upload-json')
          .attach('json', 'server/tests/testImportJSON.json')
          .expect(httpStatus.OK);

        const surveyId = res.body;

        // load Survey
        const survey = await loadSurveyDoc({ _id: surveyId });

        const {
          startPages,
          endPages,
          surveySections,
          surveyTheme,
          ...reloadSurvey
        } = survey;

        expect(startPages.length).to.be.eq(1);
        expect(endPages.length).to.be.eq(1);
        expect(endPages[0].flowItem).to.be.an('object');
        expect(surveyTheme).to.be.an('object');
        expect(reloadSurvey).to.be.an('object');

        expect(surveySections.length).to.be.eq(1);

        const [section1] = surveySections;

        expect(section1.surveyItems.length).to.be.eq(3);

        const [
          surveyItem1,
          surveyItem2,
          surveyItem3
        ] = section1.surveyItems;

        expect(surveyItem1.type).to.be.eq('question');
        expect(surveyItem1.question).to.be.an('object');
        expect(surveyItem1.question.questionItems.length).to.be.eq(1);
        expect(surveyItem2.type).to.be.eq('question');
        expect(surveyItem2.question).to.be.an('object');
        expect(surveyItem2.flowLogic.length).to.be.eq(1);
        expect(surveyItem2.flowLogic[0].flowItems.length).to.be.eq(1);
        expect(surveyItem3.type).to.be.eq('contents');
        expect(surveyItem3.contents.length).to.be.eq(1);
      });
    });
  });


  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post('/api/v1/surveys/upload-json')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
