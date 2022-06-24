import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import {
  Question,
  Trash
} from 'server/models';

// factories
import {
  companyFactory,
  questionFactory,
  teamFactory,
  userFactory,
  teamUserFactory,
  surveyItemFactory
} from '../../../../factories';

import APIMessagesExtractor from '../../../../../services/APIMessagesExtractor';

chai.config.includeStack = true;

let question;
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

  // create power user
  await userFactory({
    password,
    company,
    currentTeam: team,
    email: email1,
    isPowerUser: true
  });

  company2 = await companyFactory({});
  team2 = await teamFactory({ company: company2 });

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

describe('## DELETE /api/v1/questions/:id', () => {
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

      it('should soft delete question', async () => {
        question = await questionFactory({ team, company });

        await agent
          .delete(`/api/v1/questions/${question._id}`)
          .expect(httpStatus.NO_CONTENT);

        // reload question
        const reloadedQuestion = await Question.model.findById(question._id);
        const trash = await Trash.model.findOne({ question: reloadedQuestion });

        expect(reloadedQuestion.inTrash).to.be.eq(true);
        expect(trash).to.be.an('object');
        expect(trash.type).to.be.eq('question');
        expect(trash.stage).to.be.eq('initial');
      });

      it('should soft delete item trend question', async () => {
        question = await questionFactory({ team, company, trend: true, type: 'dropdown' });

        await surveyItemFactory({ team, company, question, type: 'trendQuestion' });

        await agent
          .delete(`/api/v1/questions/${question._id}`)
          .expect(httpStatus.NO_CONTENT);

        // reload question
        const [
          reloadedQuestion,
          trash
        ] = await Promise.all([
          Question.model.findById(question._id),
          Trash.model.findOne({ question: question._id })
        ]);

        expect(reloadedQuestion.inTrash).to.be.eq(true);
        expect(trash).to.be.an('object');
        expect(trash.type).to.be.eq('question');
        expect(trash.stage).to.be.eq('initial');
      });

      it('should reject from delete question from another company', async () => {
        question = await questionFactory({ team: team2, company: company2 });

        await agent
          .delete(`/api/v1/questions/${question._id}`)
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

      it('should soft delete question from own team', async () => {
        question = await questionFactory({ team, company });

        await agent
          .delete(`/api/v1/questions/${question._id}`)
          .expect(httpStatus.NO_CONTENT);

        // reload question
        const reloadedQuestion = await Question.model.findById(question._id);
        const trash = await Trash.model.findOne({ question: reloadedQuestion });

        expect(reloadedQuestion.inTrash).to.be.eq(true);
        expect(trash).to.be.an('object');
        expect(trash.type).to.be.eq('question');
        expect(trash.stage).to.be.eq('initial');
      });

      it('should reject from delete question from another team without permission', async () => {
        const anotherTeam = await teamFactory({ company });
        question = await questionFactory({ company, team: anotherTeam });

        await agent
          .delete(`/api/v1/questions/${question._id}`)
          .expect(httpStatus.FORBIDDEN);
      });

      it('should reject from delete question from another company', async () => {
        question = await questionFactory({ team: team2, company: company2 });

        await agent
          .delete(`/api/v1/questions/${question._id}`)
          .expect(httpStatus.FORBIDDEN);
      });

      it('should reject not found delete question from another company', async () => {
        await agent
          .delete(`/api/v1/questions/${team._id}`)
          .expect(httpStatus.NOT_FOUND);
      });
    });
  });

  describe('Unauthorized', () => {
    beforeEach(async () => await questionFactory({ team, company }));

    it('should reject with unauthorized status', async () => {
      await request(app)
        .delete(`/api/v1/questions/${question._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
