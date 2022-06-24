import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import { Survey, Trash } from 'server/models';

// factories
import {
  companyFactory,
  surveyFactory,
  teamFactory,
  userFactory,
  teamUserFactory
} from '../../../../factories';

import APIMessagesExtractor from '../../../../../services/APIMessagesExtractor';

chai.config.includeStack = true;

let survey;
let company;
let company2;
let team;
let team2;
const email1 = 'test1@email.com';
const email2 = 'test2@email.com';
const password = 'qwe123qwe';

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  company2 = await companyFactory({});
  team2 = await teamFactory({ company: company2 });

  // create power user
  await userFactory({
    password,
    company,
    email: email1,
    currentTeam: team,
    isPowerUser: true
  });

  // create team user
  const teamUser = await userFactory({
    password,
    company,
    email: email2,
    currentTeam: team
  });

  // add team to user
  await teamUserFactory({ company, team, user: teamUser });

  await APIMessagesExtractor.loadData();
}

describe('## DELETE /api/v1/surveys/:id', () => {
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

      it('should soft delete survey', async () => {
        survey = await surveyFactory({ team, company });

        await agent
          .delete(`/api/v1/surveys/${survey._id}`)
          .expect(httpStatus.NO_CONTENT);

        // reload survey
        const reloadedSurvey = await Survey.model.findById(survey._id);
        const trash = await Trash.model.findOne({ survey: reloadedSurvey });

        expect(reloadedSurvey.inTrash).to.be.eq(true);
        expect(trash).to.be.an('object');
        expect(trash.type).to.be.eq('survey');
        expect(trash.stage).to.be.eq('initial');
      });

      it('should soft delete template', async () => {
        survey = await surveyFactory({ team, company, type: 'template' });

        await agent
          .delete(`/api/v1/surveys/${survey._id}`)
          .expect(httpStatus.NO_CONTENT);

        // reload survey
        const reloadedSurvey = await Survey.model.findById(survey._id);
        const trash = await Trash.model.findOne({ survey: reloadedSurvey });

        expect(reloadedSurvey.inTrash).to.be.eq(true);
        expect(trash).to.be.an('object');
        expect(trash.type).to.be.eq('template');
        expect(trash.stage).to.be.eq('initial');
      });

      it('should reject from delete survey from another company', async () => {
        survey = await surveyFactory({ team: team2, company: company2 });

        await agent
          .delete(`/api/v1/surveys/${survey._id}`)
          .expect(httpStatus.FORBIDDEN);
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

      it('should soft delete survey from own team', async () => {
        survey = await surveyFactory({ team, company });

        await agent
          .delete(`/api/v1/surveys/${survey._id}`)
          .expect(httpStatus.NO_CONTENT);

        // reload survey
        const reloadedSurvey = await Survey.model.findById(survey._id);
        const trash = await Trash.model.findOne({ survey: reloadedSurvey });

        expect(reloadedSurvey.inTrash).to.be.eq(true);
        expect(trash).to.be.an('object');
        expect(trash.type).to.be.eq('survey');
        expect(trash.stage).to.be.eq('initial');
      });

      it('should soft delete template from own team', async () => {
        survey = await surveyFactory({ team, company, type: 'template' });

        await agent
          .delete(`/api/v1/surveys/${survey._id}`)
          .expect(httpStatus.NO_CONTENT);

        // reload survey
        const reloadedSurvey = await Survey.model.findById(survey._id);
        const trash = await Trash.model.findOne({ survey: reloadedSurvey });

        expect(reloadedSurvey.inTrash).to.be.eq(true);
        expect(trash).to.be.an('object');
        expect(trash.type).to.be.eq('template');
        expect(trash.stage).to.be.eq('initial');
      });

      it('should reject from delete survey from another team without permission', async () => {
        const anotherTeam = await teamFactory({ company });
        survey = await surveyFactory({ company, team: anotherTeam });

        await agent
          .delete(`/api/v1/surveys/${survey._id}`)
          .expect(httpStatus.FORBIDDEN);
      });

      it('should reject from delete survey from another company', async () => {
        survey = await surveyFactory({ team: team2, company: company2 });

        await agent
          .delete(`/api/v1/surveys/${survey._id}`)
          .expect(httpStatus.FORBIDDEN);
      });

      it('should reject not found from delete survey from another company', async () => {
        await agent
          .delete(`/api/v1/surveys/${team._id}`)
          .expect(httpStatus.NOT_FOUND);
      });
    });
  });

  describe('Unauthorized', () => {
    beforeEach(async () => await surveyFactory({ team, company }));

    it('should reject with unauthorized status', async () => {
      await request(app)
        .delete(`/api/v1/surveys/${survey._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
