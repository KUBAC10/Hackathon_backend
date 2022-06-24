import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import { SurveyItem, Trash } from 'server/models';

// factories
import {
  companyFactory,
  surveyItemFactory,
  teamFactory,
  userFactory,
  teamUserFactory
} from '../../../../factories';

import APIMessagesExtractor from '../../../../../services/APIMessagesExtractor';

chai.config.includeStack = true;

let surveyItem;
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

describe('## DELETE /api/v1/survey-items/:id', () => {
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

      it('should soft delete surveyItem', async () => {
        surveyItem = await surveyItemFactory({ team, company });

        await agent
          .delete(`/api/v1/survey-items/${surveyItem._id}`)
          .expect(httpStatus.NO_CONTENT);

        // reload surveyItem
        const reloadedSurveyItem = await SurveyItem.model.findById(surveyItem._id);
        const trash = await Trash.model.findOne({ surveyItem: reloadedSurveyItem });

        expect(reloadedSurveyItem.inTrash).to.be.eq(true);
        expect(trash).to.be.an('object');
        expect(trash.type).to.be.eq('surveyItem');
        expect(trash.stage).to.be.eq('initial');
      });

      it('should reject from delete surveyItem from another company', async () => {
        surveyItem = await surveyItemFactory({ team: team2, company: company2 });

        await agent
          .delete(`/api/v1/survey-items/${surveyItem._id}`)
          .expect(httpStatus.FORBIDDEN);
      });

      it('should reject from delete surveyItem from another company', async () => {
        await agent
          .delete(`/api/v1/survey-items/${team._id}`)
          .expect(httpStatus.NOT_FOUND);
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

      it('should soft delete surveyItem from own team', async () => {
        surveyItem = await surveyItemFactory({ team, company });

        await agent
          .delete(`/api/v1/survey-items/${surveyItem._id}`)
          .expect(httpStatus.NO_CONTENT);

        // reload surveyItem
        const reloadedSurveyItem = await SurveyItem.model.findById(surveyItem._id);
        const trash = await Trash.model.findOne({ surveyItem: reloadedSurveyItem });

        expect(reloadedSurveyItem.inTrash).to.be.eq(true);
        expect(trash).to.be.an('object');
        expect(trash.type).to.be.eq('surveyItem');
        expect(trash.stage).to.be.eq('initial');
      });

      it('should reject from delete surveyItem from another team without permission', async () => {
        const anotherTeam = await teamFactory({ company });
        surveyItem = await surveyItemFactory({ company, team: anotherTeam });

        await agent
          .delete(`/api/v1/survey-items/${surveyItem._id}`)
          .expect(httpStatus.FORBIDDEN);
      });

      it('should reject from delete surveyItem from another company', async () => {
        surveyItem = await surveyItemFactory({ team: team2, company: company2 });

        await agent
          .delete(`/api/v1/survey-items/${surveyItem._id}`)
          .expect(httpStatus.FORBIDDEN);
      });

      it('should reject from delete surveyItem from another company', async () => {
        await agent
          .delete(`/api/v1/survey-items/${team._id}`)
          .expect(httpStatus.NOT_FOUND);
      });
    });
  });

  describe('Unauthorized', () => {
    beforeEach(async () => await surveyItemFactory({ team, company }));

    it('should reject with unauthorized status', async () => {
      await request(app)
        .delete(`/api/v1/survey-items/${surveyItem._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
