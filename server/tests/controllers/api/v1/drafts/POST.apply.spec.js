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
  userFactory,
  contentItemFactory
} from '../../../../factories';

// models
import {
  SurveySection,
  SurveyItem,
  QuestionItem
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

describe('## POST /api/v1/drafts/apply/:id', () => {
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
        survey = await surveyFactory({ team, company, inDraft: true, draftData: { key: 'value' } });

        // create surveySections
        [
          surveySection,
          surveySectionToRemove
        ] = await Promise.all([
          surveySectionFactory({ team, survey, inDraft: true, draftData: { key: 'value' } }),
          surveySectionFactory({ team, survey, draftRemove: true })
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
          questionItemFactory({ team, question, inDraft: true, draftData: { key: 'value' } }),
          questionItemFactory({ team, question, draftRemove: true }),
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
            inDraft: true,
            draftData: { key: 'value' }
          }),
          surveyItemFactory({
            team,
            survey,
            surveySection,
            draftRemove: true
          })
        ]);
      });

      it('should apply draft and return survey', async () => {
        const res = await agent
          .post(`/api/v1/drafts/apply/${survey._id}`)
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
        expect(surveyItemToRemove.inTrash).to.be.eq(true);
        expect(questionItemToRemove.inTrash).to.be.eq(true);

        expect(res.body).to.be.an('object');
        expect(res.body.inDraft).to.be.eq(false);
        expect(res.body.draftData).to.deep.eq({});

        expect(surveySection).to.be.an('object');
        expect(surveySection.inDraft).to.be.eq(false);
        expect(surveySection.draftData).to.deep.eq({});

        expect(surveyItem).to.be.an('object');
        expect(surveyItem.inDraft).to.be.eq(false);
        expect(surveyItem.draftData).to.deep.eq({});

        expect(surveyItem.question).to.be.an('object');
        expect(surveyItem.question.draftData).to.deep.eq({});

        expect(questionItem).to.be.an('object');
        expect(questionItem.inDraft).to.be.eq(false);
        expect(questionItem.draftData).to.deep.eq({});
      });

      it('should return list of changed fields to translate', async () => {
        survey = await surveyFactory({
          team,
          company,
          inDraft: true,
          draftData: { nameChanged: true }
        });

        const res = await agent
          .post(`/api/v1/drafts/apply/${survey._id}`)
          .expect(httpStatus.BAD_REQUEST);

        expect(res.body.untranslatedFields.length).to.be.eq(1);

        const [error] = res.body.untranslatedFields;

        expect(error.entity).to.be.eq('survey');
        expect(error.entityId).to.be.eq(survey._id.toString());
        expect(error.field).to.be.eq('name');
      });

      it('should return endpages and startpages after draft apply', async () => {
        // create survey
        survey = await surveyFactory({ team, company });
        // create start end pages
        await Promise.all([
          contentItemFactory({ type: 'startPage', survey }),
          contentItemFactory({ type: 'endPage', survey })
        ]);

        const res = await agent
          .post(`/api/v1/drafts/apply/${survey._id}`)
          .expect(httpStatus.OK);

        expect(res.body.startPages[0].survey.toString()).to.be.eq(survey._id.toString());
        expect(res.body.startPages[0].type).to.be.eq('startPage');

        expect(res.body.endPages[0].survey.toString()).to.be.eq(survey._id.toString());
        expect(res.body.endPages[0].type).to.be.eq('endPage');
      });

      // should hard remove contentItems/questions
      xit('should remove all draft trash items');

      // "draftData" should became normal survey data
      // const survey = await Survey.model.findById(id)...
      xit('should apply data to original survey and remove draftData');
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
        survey = await surveyFactory({ team, company, inDraft: true, draftData: { key: 'value' } });

        // create surveySections
        [
          surveySection,
          surveySectionToRemove
        ] = await Promise.all([
          surveySectionFactory({ team, survey, inDraft: true, draftData: { key: 'value' } }),
          surveySectionFactory({ team, survey, draftRemove: true })
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
          questionItemFactory({ team, question, inDraft: true, draftData: { key: 'value' } }),
          questionItemFactory({ team, question, draftRemove: true }),
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
            inDraft: true,
            draftData: { key: 'value' }
          }),
          surveyItemFactory({
            team,
            survey,
            surveySection,
            draftRemove: true
          })
        ]);
      });

      it('should apply draft and return survey', async () => {
        const res = await agent
          .post(`/api/v1/drafts/apply/${survey._id}`)
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
        expect(surveyItemToRemove.inTrash).to.be.eq(true);
        expect(questionItemToRemove.inTrash).to.be.eq(true);

        expect(res.body).to.be.an('object');
        expect(res.body.inDraft).to.be.eq(false);
        expect(res.body.draftData).to.deep.eq({});

        expect(surveySection).to.be.an('object');
        expect(surveySection.inDraft).to.be.eq(false);
        expect(surveySection.draftData).to.deep.eq({});

        expect(surveyItem).to.be.an('object');
        expect(surveyItem.inDraft).to.be.eq(false);
        expect(surveyItem.draftData).to.deep.eq({});

        expect(surveyItem.question).to.be.an('object');
        expect(surveyItem.question.draftData).to.deep.eq({});

        expect(questionItem).to.be.an('object');
        expect(questionItem.inDraft).to.be.eq(false);
        expect(questionItem.draftData).to.deep.eq({});
      });

      it('should recount sortableId for not hidden sections and return correct values', async () => {
        // create a survey
        const survey = await surveyFactory({ team, company, inDraft: true });

        // create surveySections
        const [
          surveySection1,
          surveySection2,
          surveySection3,
          surveySection4
        ] = await Promise.all([
          surveySectionFactory({ team, company, survey, inDraft: true, hide: true, sortableId: 0 }),
          surveySectionFactory({ team, company, survey, inDraft: true, sortableId: 1 }),
          surveySectionFactory({ team, company, survey, inDraft: true, hide: true, sortableId: 2 }),
          surveySectionFactory({ team, company, survey, inDraft: true, sortableId: 3 }),
        ]);

        // create questions
        const question1 = await questionFactory({
          team,
          type: 'dropdown'
        });

        // create surveyItems
        await Promise.all([
          surveyItemFactory({
            team,
            survey,
            surveySection: surveySection1,
            question: question1,
            inDraft: true
          }),
          surveyItemFactory({
            team,
            survey,
            surveySection: surveySection2,
            question: question1,
            inDraft: true,
          }),
          surveyItemFactory({
            team,
            survey,
            surveySection: surveySection3,
            question: question1,
            inDraft: true
          }),
          surveyItemFactory({
            team,
            survey,
            surveySection: surveySection4,
            question: question1,
            inDraft: true
          })
        ]);

        const res = await agent
          .post(`/api/v1/drafts/apply/${survey._id}`)
          .expect(httpStatus.OK);

        const sections = res.body.surveySections;
        //  section2 from response (1st not hidden)
        const s2 = sections.find(i => i._id.toString() === surveySection2._id.toString());
        //  section4 from response (2nd not hidden)
        const s4 = sections.find(i => i._id.toString() === surveySection4._id.toString());

        expect(s2.step).to.be.eq(0);
        expect(s4.step).to.be.eq(1);
      });

      it('should return list of changed fields to translate', async () => {
        survey = await surveyFactory({
          team,
          company,
          inDraft: true,
          draftData: { nameChanged: true }
        });

        const res = await agent
          .post(`/api/v1/drafts/apply/${survey._id}`)
          .expect(httpStatus.BAD_REQUEST);


        expect(res.body.untranslatedFields.length).to.be.eq(1);
        const [error] = res.body.untranslatedFields;
        expect(error.entity).to.be.eq('survey');
        expect(error.entityId).to.be.eq(survey._id.toString());
        expect(error.field).to.be.eq('name');
      });

      it('shouldn`t return an error if section has no active survey items, but section is hidden', async () => {
        survey = await surveyFactory({
          team,
          company
        });
        const [
          surveySection1,
          surveySection2
        ] = await Promise.all([
          surveySectionFactory({ survey, sortableId: 0, hide: true }),
          surveySectionFactory({ survey, sortableId: 1 }),
        ]);
        const [
          surveyItem1,
          surveyItem2
        ] = await Promise.all([
          surveyItemFactory({ survey, surveySection: surveySection1, hide: true }),
          surveyItemFactory({ survey, surveySection: surveySection2, sortableId: 0 }),
          surveyItemFactory({ survey, surveySection: surveySection2, sortableId: 1 })
        ]);

        const res = await agent
          .post(`/api/v1/drafts/apply/${survey._id}`)
          .expect(httpStatus.OK);

        const sec = res.body.surveySections;
        expect(sec[0].surveyItems[0]._id.toString()).to.be.eq(surveyItem1._id.toString());
        expect(sec[0].surveyItems[0].inDraft).to.be.eq(false);
        expect(sec[0].surveyItems[0].hide).to.be.eq(true);

        expect(sec[1].surveyItems[0]._id.toString()).to.be.eq(surveyItem2._id.toString());
        expect(sec[1].surveyItems[0].inDraft).to.be.eq(false);
        expect(sec[1].surveyItems[0].hide).to.be.eq(false);
      });

      it('shouldn`t return an error if just one section exists, it`s empty but hidden', async () => {
        survey = await surveyFactory({
          team,
          company
        });

        const surveySection1 = await surveySectionFactory({ survey, sortableId: 0, hide: true });

        const res = await agent
          .post(`/api/v1/drafts/apply/${survey._id}`)
          .expect(httpStatus.OK);

        const sec = res.body.surveySections;
        expect(sec[0]._id.toString()).to.be.eq(surveySection1._id.toString());
        expect(sec[0].inDraft).to.be.eq(false);
        expect(sec[0].hide).to.be.eq(true);
      });

      it('should return endpages and startpages after draft apply', async () => {
        // create survey
        survey = await surveyFactory({ team, company });
        // create start end pages
        await Promise.all([
          contentItemFactory({ type: 'startPage', survey }),
          contentItemFactory({ type: 'endPage', survey })
        ]);

        const res = await agent
          .post(`/api/v1/drafts/apply/${survey._id}`)
          .expect(httpStatus.OK);

        expect(res.body.startPages[0].survey.toString()).to.be.eq(survey._id.toString());
        expect(res.body.startPages[0].type).to.be.eq('startPage');

        expect(res.body.endPages[0].survey.toString()).to.be.eq(survey._id.toString());
        expect(res.body.endPages[0].type).to.be.eq('endPage');
      });

      // should hard remove contentItems/questions
      xit('should remove all draft trash items');

      // "draftData" should became normal survey data
      // const survey = await Survey.model.findById(id)...
      xit('should apply data to original survey and remove draftData');
    });
  });

  describe('Unauthorized', () => {
    it('should return Unauthorized stats', async () => {
      await request.agent(app)
        .post(`/api/v1/drafts/apply/${survey._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
