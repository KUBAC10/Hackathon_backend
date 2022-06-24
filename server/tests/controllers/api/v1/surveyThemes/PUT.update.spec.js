import request from 'supertest';
import httpStatus from 'http-status';
import { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory, surveyFactory,
  surveyThemeFactory,
  teamFactory,
  teamUserFactory,
  userFactory
} from '../../../../factories';

const password = 'qwe123qwe';
const email = 'poweser@email.com';
const email2 = 'teamusser@email.com';

let survey;
let powerUser;
let teamUser;
let company;
let team;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  survey = await surveyFactory({ company, team });

  // create Power Users
  powerUser = await userFactory({ email, password, isPowerUser: true, company, currentTeam: team });

  // create Team user
  teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, company, team });
}

describe('## PUT /api/v1/survey-themes/:id', () => {
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

      it('should update existing theme', async () => {
        const theme = await surveyThemeFactory({ createdBy: powerUser._id, type: 'user' });

        const res = await agent
          .put(`/api/v1/survey-themes/${theme._id}`)
          .send({ name: 'Custom Name' })
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(theme._id.toString());
        expect(res.body.name).to.be.eq('Custom Name');
      });

      it('should update existing survey theme', async () => {
        const theme = await surveyThemeFactory({ company, team, type: 'survey', survey });

        const res = await agent
          .put(`/api/v1/survey-themes/${theme._id}`)
          .send({ name: 'Custom Name' })
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(theme._id.toString());
        expect(res.body.draftData.name).to.be.eq('Custom Name');
      });

      it('should not update settings if custom animation enable', async () => {
        const survey = await surveyFactory({ team, company, customAnimation: true });
        const theme = await surveyThemeFactory({
          company,
          team,
          survey,
          type: 'survey',
          progressBar: true,
          questionNumbers: true
        });

        const res = await agent
          .put(`/api/v1/survey-themes/${theme._id}`)
          .send({
            progressBar: false,
            questionNumbers: false
          })
          .expect(httpStatus.OK);

        // expect(res.body.draftData.progressBar).to.be.eq(undefined);
        expect(res.body.draftData.questionNumbers).to.be.eq(undefined);
      });

      it('should return not found status', async () => {
        const theme = await surveyThemeFactory({});

        await agent
          .put(`/api/v1/survey-themes/${theme._id}`)
          .send({ name: 'Custom Name' })
          .expect(httpStatus.NOT_FOUND);
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

      it('should update existing theme', async () => {
        const theme = await surveyThemeFactory({ createdBy: teamUser._id, type: 'user' });

        const res = await agent
          .put(`/api/v1/survey-themes/${theme._id}`)
          .send({ name: 'Custom Name' })
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(theme._id.toString());
        expect(res.body.name).to.be.eq('Custom Name');
      });

      it('should update existing survey theme', async () => {
        const theme = await surveyThemeFactory({ company, team, type: 'survey', survey });

        const res = await agent
          .put(`/api/v1/survey-themes/${theme._id}`)
          .send({ name: 'Custom Name' })
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(theme._id.toString());
        expect(res.body.draftData.name).to.be.eq('Custom Name');
      });

      it('should return not found status', async () => {
        const theme = await surveyThemeFactory({});

        await agent
          .put(`/api/v1/survey-themes/${theme._id}`)
          .send({ name: 'Custom Name' })
          .expect(httpStatus.NOT_FOUND);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return Unauthorized status', async () => {
      await request.agent(app)
        .put(`/api/v1/survey-themes/${powerUser._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
