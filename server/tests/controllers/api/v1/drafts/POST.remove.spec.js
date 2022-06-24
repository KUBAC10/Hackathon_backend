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

// models
import {
  SurveySection,
  SurveyItem, QuestionItem
} from '../../../../../models';

const password = 'qwe123qwe';
const email = 'poweser@email.com';
const email2 = 'teamusser@email.com';

let company;
let team;
let survey;
let surveySection;
let surveySectionToRemove;
let surveyItem;
let surveyItemToRemove;
let question;
let questionItem;
let questionItemToRemove;

async function makeTestData() {
  // create company
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create users
  let user = await userFactory({ email, password, currentTeam: team, company, isPowerUser: true });
  await teamUserFactory({ user, team, company });

  // create Team user
  user = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user, team, company });
}

describe('## POST /api/v1/drafts/remove/:id', () => {
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

        // create survey
        survey = await surveyFactory({ team, company, draftData: { key: 'value' } });

        // create surveySections
        [
          surveySection,
          surveySectionToRemove
        ] = await Promise.all([
          surveySectionFactory({ team, survey, inDraft: false, draftRemove: true, draftData: { key: 'value' } }),
          surveySectionFactory({ team, survey, inDraft: true })
        ]);

        // create questions
        question = await questionFactory({
          team,
          type: 'dropdown',
          draftData: { key: 'value' }
        });

        // create questionItems rows and columns
        [
          questionItem,
          questionItemToRemove
        ] = await Promise.all([
          questionItemFactory({ team, question, draftRemove: true, draftData: { key: 'value' } }),
          questionItemFactory({ team, question, inDraft: true }),
        ]);

        // create surveyItems
        [
          surveyItem,
          surveyItemToRemove
        ] = await Promise.all([
          surveyItemFactory({
            team,
            survey,
            surveySection,
            question,
            inDraft: false,
            draftRemove: true,
            draftData: { key: 'value' }
          }),
          surveyItemFactory({
            team,
            survey,
            surveySection,
            inDraft: true
          })
        ]);
      });

      it('should close draft and return survey', async () => {
        const res = await agent
          .post(`/api/v1/drafts/remove/${survey._id}`)
          .expect(httpStatus.OK);

        [surveySection] = res.body.surveySections;
        [surveyItem] = surveySection.surveyItems;
        [questionItem] = surveyItem.question.questionItems;
        [
          surveySectionToRemove,
          surveyItemToRemove,
          questionItemToRemove,
        ] = await Promise.all([
          SurveySection.model.findById(surveySectionToRemove._id),
          SurveyItem.model.findById(surveyItemToRemove._id),
          QuestionItem.model.findById(questionItemToRemove._id),
        ]);

        expect(surveySectionToRemove).to.be.eq(null);
        expect(questionItemToRemove).to.be.eq(null);
        expect(surveyItemToRemove.inTrash).to.be.eq(true);

        expect(res.body).to.be.an('object');
        expect(res.body.inDraft).to.be.eq(false);
        expect(res.body.draftData).to.deep.eq({});

        expect(surveySection).to.be.an('object');
        expect(surveySection.draftRemove).to.be.eq(false);
        expect(surveySection.draftData).to.deep.eq({});

        expect(surveyItem).to.be.an('object');
        expect(surveyItem.draftRemove).to.be.eq(false);
        expect(surveyItem.draftData).to.deep.eq({});

        expect(surveyItem.question).to.be.an('object');
        expect(surveyItem.question.draftData).to.deep.eq({});

        expect(questionItem).to.be.an('object');
        expect(questionItem.draftRemove).to.be.eq(false);
        expect(questionItem.draftData).to.deep.eq({});
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

        // create survey
        survey = await surveyFactory({ team, company, draftData: { key: 'value' } });

        // create surveySections
        [
          surveySection,
          surveySectionToRemove
        ] = await Promise.all([
          surveySectionFactory({ team, survey, inDraft: false, draftRemove: true, draftData: { key: 'value' } }),
          surveySectionFactory({ team, survey, inDraft: true })
        ]);

        // create questions
        question = await questionFactory({
          team,
          type: 'dropdown',
          draftData: { key: 'value' }
        });

        // create questionItems rows and columns
        [
          questionItem,
          questionItemToRemove
        ] = await Promise.all([
          questionItemFactory({ team, question, draftRemove: true, draftData: { key: 'value' } }),
          questionItemFactory({ team, question, inDraft: true }),
        ]);

        // create surveyItems
        [
          surveyItem,
          surveyItemToRemove
        ] = await Promise.all([
          surveyItemFactory({
            team,
            survey,
            surveySection,
            question,
            inDraft: false,
            draftRemove: true,
            draftData: { key: 'value' }
          }),
          surveyItemFactory({
            team,
            survey,
            surveySection,
            inDraft: true
          })
        ]);
      });

      it('should close draft and return survey', async () => {
        const res = await agent
          .post(`/api/v1/drafts/remove/${survey._id}`)
          .expect(httpStatus.OK);

        [surveySection] = res.body.surveySections;
        [surveyItem] = surveySection.surveyItems;
        [questionItem] = surveyItem.question.questionItems;
        [
          surveySectionToRemove,
          surveyItemToRemove,
          questionItemToRemove,
        ] = await Promise.all([
          SurveySection.model.findById(surveySectionToRemove._id),
          SurveyItem.model.findById(surveyItemToRemove._id),
          QuestionItem.model.findById(questionItemToRemove._id),
        ]);

        expect(surveySectionToRemove).to.be.eq(null);
        expect(questionItemToRemove).to.be.eq(null);
        expect(surveyItemToRemove.inTrash).to.be.eq(true);

        expect(res.body).to.be.an('object');
        expect(res.body.inDraft).to.be.eq(false);
        expect(res.body.draftData).to.deep.eq({});

        expect(surveySection).to.be.an('object');
        expect(surveySection.draftRemove).to.be.eq(false);
        expect(surveySection.draftData).to.deep.eq({});

        expect(surveyItem).to.be.an('object');
        expect(surveyItem.draftRemove).to.be.eq(false);
        expect(surveyItem.draftData).to.deep.eq({});

        expect(surveyItem.question).to.be.an('object');
        expect(surveyItem.question.draftData).to.deep.eq({});

        expect(questionItem).to.be.an('object');
        expect(questionItem.draftRemove).to.be.eq(false);
        expect(questionItem.draftData).to.deep.eq({});
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return Unauthorized stats', async () => {
      await request.agent(app)
        .post(`/api/v1/drafts/remove/${survey._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
