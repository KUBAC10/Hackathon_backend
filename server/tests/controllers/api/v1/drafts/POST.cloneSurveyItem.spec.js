import request from 'supertest';
import httpStatus from 'http-status';
import { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory,
  gridColumnFactory,
  gridRowFactory,
  questionFactory,
  questionItemFactory, surveyFactory,
  surveyItemFactory, surveySectionFactory,
  teamFactory,
  teamUserFactory,
  userFactory
} from '../../../../factories';

// models
import {
  SurveyItem,
  Question,
  QuestionItem,
  GridRow,
  GridColumn
} from '../../../../../models';

const password = 'qwe123qwe';
const email = 'poweser@email.com';
const email2 = 'teamusser@email.com';

let company;
let team;
let survey;
let surveySection;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({});

  survey = await surveyFactory({ team, company });

  surveySection = await surveySectionFactory({ survey });

  // create users
  let user = await userFactory({ email, password, currentTeam: team, company, isPowerUser: true });
  await teamUserFactory({ user, team, company });

  // create Team user
  user = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user, team, company });
}

describe('## POST /api/v1/drafts/clone-survey-item', () => {
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

      it('Should clone survey item and related entities with item type question', async () => {
        const question = await questionFactory({
          type: 'dropdown',
          team: team._id,
          company: company._id
        });
        const [surveyItem] = await Promise.all([
          surveyItemFactory({
            company,
            team,
            question,
            inDraft: true,
            sortableId: 0,
            surveySection: surveySection._id,
            survey: survey._id
          }),
          questionItemFactory({
            question,
            inDraft: true,
            team: team._id,
            company: company._id,
            sortableId: 0
          }),
          questionItemFactory({
            question,
            inDraft: true,
            team: team._id,
            company: company._id,
            sortableId: 1
          })
        ]);

        const res = await agent
          .post('/api/v1/drafts/clone-survey-item')
          .send({
            surveyItemId: surveyItem._id
          })
          .expect(httpStatus.CREATED);

        const [
          cloneSurveyItem,
          cloneQuestion,
          cloneQuestionItem1,
          cloneQuestionItem2
        ] = await Promise.all([
          SurveyItem.model.findOne({ _id: res.body._id }),
          Question.model.findOne({ _id: res.body.question }),
          QuestionItem.model.findOne({ _id: res.body.question.questionItems[0]._id }),
          QuestionItem.model.findOne({ _id: res.body.question.questionItems[1]._id }),
        ]);

        expect(cloneSurveyItem.question.toString()).to.be.eq(cloneQuestion._id.toString());
        expect(cloneSurveyItem.survey.toString()).to.be.eq(survey._id.toString());
        expect(cloneSurveyItem.surveySection.toString()).to.be.eq(surveySection._id.toString());
        expect(cloneQuestion.type).to.be.eq(cloneQuestion.type);
        expect(cloneQuestionItem1.question.toString()).to.be.eq(cloneQuestion._id.toString());
        expect(cloneQuestionItem1.sortableId).to.be.eq(0);
        expect(cloneQuestionItem2.question.toString()).to.be.eq(cloneQuestion._id.toString());
        expect(cloneQuestionItem2.sortableId).to.be.eq(1);
      });

      it('should clone survey item with correct questionId for each question item and correct quizCorrect value', async () => {
        const survey = await surveyFactory({ team, company });

        // create a surveySection
        const surveySection = await surveySectionFactory({ team, company, survey });

        // create a question
        const question = await questionFactory({
          team,
          company,
          type: 'dropdown',
          quiz: true
        });

        // create questionItems and a surveyItem
        const [
          surveyItem
        ] = await Promise.all([
          surveyItemFactory({
            team,
            company,
            survey,
            surveySection,
            question,
            inDraft: true
          }),
          questionItemFactory({
            team,
            company,
            question,
            quizCorrect: false,
            inDraft: true,
            sortableId: 0
          }),
          questionItemFactory({
            team,
            company,
            question,
            quizCorrect: true,
            inDraft: true,
            sortableId: 1
          }),
          questionItemFactory({
            team,
            company,
            question,
            quizCorrect: true,
            inDraft: true,
            sortableId: 2
          })
        ]);

        const res = await agent
          .post('/api/v1/drafts/clone-survey-item')
          .send({
            surveyItemId: surveyItem._id
          })
          .expect(httpStatus.CREATED);

        const questionItem1 = res.body.question.questionItems[0];
        const questionItem2 = res.body.question.questionItems[1];
        const questionItem3 = res.body.question.questionItems[2];

        const draftData1 = res.body.question.questionItems[0].draftData;
        const draftData2 = res.body.question.questionItems[1].draftData;
        const draftData3 = res.body.question.questionItems[2].draftData;

        const clonedQuestion = await SurveyItem.model.findOne({ _id: res.body._id });

        //  check if cloned surveyItem has a correct questionId value
        expect(draftData1.question.toString()).to.be.eq(clonedQuestion.question.toString());
        expect(questionItem1.question).to.be.eq(clonedQuestion.question.toString());
        expect(draftData2.question.toString()).to.be.eq(clonedQuestion.question.toString());
        expect(questionItem2.question).to.be.eq(clonedQuestion.question.toString());
        expect(draftData3.question.toString()).to.be.eq(clonedQuestion.question.toString());
        expect(questionItem3.question).to.be.eq(clonedQuestion.question.toString());

        //  check if questionItems have correct quizCorrect params after the clone-procedure
        expect(res.body.question.questionItems[0].quizCorrect).to.be.eq(false);
        expect(res.body.question.questionItems[1].quizCorrect).to.be.eq(true);
        expect(res.body.question.questionItems[2].quizCorrect).to.be.eq(true);
      });

      it('Should clone survey item and related entities with matrix type question', async () => {
        const question = await questionFactory({
          type: 'multipleChoiceMatrix',
          team: team._id,
          company: company._id
        });
        const [surveyItem] = await Promise.all([
          surveyItemFactory({
            company,
            team,
            question,
            inDraft: true,
            sortableId: 0,
            surveySection: surveySection._id,
            survey: survey._id,
          }),
          gridRowFactory({
            question,
            inDraft: true,
            team: team._id,
            company: company._id,
            sortableId: 0,
          }),
          gridColumnFactory({
            question,
            inDraft: true,
            team: team._id,
            company: company._id,
            sortableId: 1,
          })
        ]);

        const res = await agent
          .post('/api/v1/drafts/clone-survey-item')
          .send({
            surveyItemId: surveyItem._id
          })
          .expect(httpStatus.CREATED);

        const [
          cloneSurveyItem,
          cloneQuestion,
          cloneGridRow,
          cloneGridColumn
        ] = await Promise.all([
          SurveyItem.model.findOne({ _id: res.body._id }),
          Question.model.findOne({ _id: res.body.question }),
          GridRow.model.findOne({ _id: res.body.question.gridRows[0]._id }),
          GridColumn.model.findOne({ _id: res.body.question.gridColumns[0]._id }),
        ]);

        expect(cloneSurveyItem.question.toString()).to.be.eq(cloneQuestion._id.toString());
        expect(cloneSurveyItem.survey.toString()).to.be.eq(survey._id.toString());
        expect(cloneSurveyItem.surveySection.toString()).to.be.eq(surveySection._id.toString());
        expect(cloneQuestion.type).to.be.eq(cloneQuestion.type);
        expect(cloneGridRow.question.toString()).to.be.eq(cloneQuestion._id.toString());
        expect(cloneGridRow.sortableId).to.be.eq(0);
        expect(cloneGridColumn.question.toString()).to.be.eq(cloneQuestion._id.toString());
        expect(cloneGridColumn.sortableId).to.be.eq(1);
      });

      // example, user1 created surveyItem1, user2 had clone -> should be createdBy: user2
      xit('should set correct createdBy of ALL cloned items');

      it('should set correct sortableId for cloning survey item between two other items', async () => {
        const survey = await surveyFactory({ team, company, surveyType: 'survey', showResultText: 'showResult' });
        const surveySection = await surveySectionFactory({ team, company, survey, sortableId: 0 });

        const [
          surveyItem1
        ] = await Promise.all([
          surveyItemFactory({
            team,
            company,
            survey,
            sortableId: 0,
            draftData: { sortableId: 2.75 },
            surveySection
          }),
        ]);

        const [
          surveyItem2,
        ] = await Promise.all([
          surveyItemFactory({
            team,
            company,
            survey,
            sortableId: 0,
            draftData: { sortableId: 3 },
            surveySection
          })
        ]);

        const [
          surveyItem3,
        ] = await Promise.all([
          surveyItemFactory({
            team,
            company,
            survey,
            surveySection,
            sortableId: 0,
            draftData: { sortableId: 4 }
          })
        ]);

        const res = await agent
          .post('/api/v1/drafts/clone-survey-item')
          .send({
            surveyItemId: surveyItem1._id
          })
          .expect(httpStatus.CREATED);

        const [
          updatedSurveyItem1,
          cloneSurveyItem,
          updatedSurveyItem2,
          updatedSurveyItem3
        ] = await Promise.all([
          SurveyItem.model.findOne({ _id: surveyItem1._id }),
          SurveyItem.model.findOne({ _id: res.body._id }),
          SurveyItem.model.findOne({ _id: surveyItem2._id }),
          SurveyItem.model.findOne({ _id: surveyItem3._id }),
        ]);

        expect(updatedSurveyItem1.draftData.sortableId).to.be.eq(2.75);
        expect(cloneSurveyItem.draftData.sortableId).to.be.eq(2.875);
        expect(updatedSurveyItem2.draftData.sortableId).to.be.eq(3);
        expect(updatedSurveyItem3.draftData.sortableId).to.be.eq(4);
      });

      it('should set correct sortableId for cloning survey item, if source element is a last one in a section ', async () => {
        const survey = await surveyFactory({ team, company, surveyType: 'survey', showResultText: 'showResult' });
        const surveySection = await surveySectionFactory({ team, company, survey, sortableId: 0 });

        const [
          surveyItem1
        ] = await Promise.all([
          surveyItemFactory({
            team,
            company,
            survey,
            sortableId: 0,
            surveySection
          }),
        ]);

        const [
          surveyItem2,
        ] = await Promise.all([
          surveyItemFactory({
            team,
            company,
            survey,
            sortableId: 1,
            surveySection
          })
        ]);

        const [
          surveyItem3,
        ] = await Promise.all([
          surveyItemFactory({
            team,
            company,
            survey,
            sortableId: 2,
            surveySection
          })
        ]);

        const res = await agent
          .post('/api/v1/drafts/clone-survey-item')
          .send({
            surveyItemId: surveyItem3._id
          })
          .expect(httpStatus.CREATED);

        const [
          updatedSurveyItem1,
          updatedSurveyItem2,
          updatedSurveyItem3,
          cloneSurveyItem,
        ] = await Promise.all([
          SurveyItem.model.findOne({ _id: surveyItem1._id }),
          SurveyItem.model.findOne({ _id: surveyItem2._id }),
          SurveyItem.model.findOne({ _id: surveyItem3._id }),
          SurveyItem.model.findOne({ _id: res.body._id }),
        ]);

        expect(updatedSurveyItem1.sortableId).to.be.eq(0);
        expect(updatedSurveyItem2.sortableId).to.be.eq(1);
        expect(updatedSurveyItem3.sortableId).to.be.eq(2);
        expect(cloneSurveyItem.draftData.sortableId).to.be.eq(3);
      });

      // survey items with trend questions have only reference to questions
      xit('should create correct new surveyItem with trend question');
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

      it('Should clone survey item and related entities with item type question', async () => {
        const question = await questionFactory({
          type: 'dropdown',
          team: team._id,
          company: company._id
        });
        const [surveyItem] = await Promise.all([
          surveyItemFactory({
            company,
            team,
            question,
            inDraft: true,
            sortableId: 0,
            surveySection: surveySection._id,
            survey: survey._id
          }),
          questionItemFactory({
            question,
            inDraft: true,
            team: team._id,
            company: company._id,
            sortableId: 0
          }),
          questionItemFactory({
            question,
            inDraft: true,
            team: team._id,
            company: company._id,
            sortableId: 1
          })
        ]);

        const res = await agent
          .post('/api/v1/drafts/clone-survey-item')
          .send({
            surveyItemId: surveyItem._id
          })
          .expect(httpStatus.CREATED);

        const [
          cloneSurveyItem,
          cloneQuestion,
          cloneQuestionItem1,
          cloneQuestionItem2
        ] = await Promise.all([
          SurveyItem.model.findOne({ _id: res.body._id }),
          Question.model.findOne({ _id: res.body.question }),
          QuestionItem.model.findOne({ _id: res.body.question.questionItems[0]._id }),
          QuestionItem.model.findOne({ _id: res.body.question.questionItems[1]._id }),
        ]);

        expect(cloneSurveyItem.question.toString()).to.be.eq(cloneQuestion._id.toString());
        expect(cloneSurveyItem.survey.toString()).to.be.eq(survey._id.toString());
        expect(cloneSurveyItem.surveySection.toString()).to.be.eq(surveySection._id.toString());
        expect(cloneQuestion.type).to.be.eq(cloneQuestion.type);
        expect(cloneQuestionItem1.question.toString()).to.be.eq(cloneQuestion._id.toString());
        expect(cloneQuestionItem1.sortableId).to.be.eq(0);
        expect(cloneQuestionItem2.question.toString()).to.be.eq(cloneQuestion._id.toString());
        expect(cloneQuestionItem2.sortableId).to.be.eq(1);
      });

      it('Should clone survey item and related entities with matrix type question', async () => {
        const question = await questionFactory({
          type: 'multipleChoiceMatrix',
          team: team._id,
          company: company._id
        });
        const [surveyItem] = await Promise.all([
          surveyItemFactory({
            company,
            team,
            question,
            inDraft: true,
            sortableId: 0,
            surveySection: surveySection._id,
            survey: survey._id,
          }),
          gridRowFactory({
            question,
            inDraft: true,
            team: team._id,
            company: company._id,
            sortableId: 0,
          }),
          gridColumnFactory({
            question,
            inDraft: true,
            team: team._id,
            company: company._id,
            sortableId: 1,
          })
        ]);

        const res = await agent
          .post('/api/v1/drafts/clone-survey-item')
          .send({
            surveyItemId: surveyItem._id
          })
          .expect(httpStatus.CREATED);

        const [
          cloneSurveyItem,
          cloneQuestion,
          cloneGridRow,
          cloneGridColumn
        ] = await Promise.all([
          SurveyItem.model.findOne({ _id: res.body._id }),
          Question.model.findOne({ _id: res.body.question }),
          GridRow.model.findOne({ _id: res.body.question.gridRows[0]._id }),
          GridColumn.model.findOne({ _id: res.body.question.gridColumns[0]._id }),
        ]);

        expect(cloneSurveyItem.question.toString()).to.be.eq(cloneQuestion._id.toString());
        expect(cloneSurveyItem.survey.toString()).to.be.eq(survey._id.toString());
        expect(cloneSurveyItem.surveySection.toString()).to.be.eq(surveySection._id.toString());
        expect(cloneQuestion.type).to.be.eq(cloneQuestion.type);
        expect(cloneGridRow.question.toString()).to.be.eq(cloneQuestion._id.toString());
        expect(cloneGridRow.sortableId).to.be.eq(0);
        expect(cloneGridColumn.question.toString()).to.be.eq(cloneQuestion._id.toString());
        expect(cloneGridColumn.sortableId).to.be.eq(1);
      });
    });
  });
});
