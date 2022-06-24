import uuid from 'uuid';
import request from 'supertest';
import moment from 'moment';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// factories
import {
  questionFactory,
  surveyFactory,
  companyFactory,
  teamFactory,
  questionItemFactory,
  surveyItemFactory,
  surveyResultFactory,
  surveySectionFactory,
  inviteFactory,
  userFactory,
  teamUserFactory,
  contentItemFactory, flowItemFactory,
} from 'server/tests/factories';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

chai.config.includeStack = true;

const email = 'example@email.com';
const email2 = 'example2@email.com';
const password = 'password';
const token = uuid();

let company;
let team;
let survey;
let surveySection;
let surveyItem;
let question;
let item1;
let item2;
let item3;
let startPage;
let endPage;

async function makeTestData() {
  // create company and team
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create survey
  survey = await surveyFactory({
    company,
    team,
    allowReAnswer: true,
    startDate: moment().add(1, 'day'),
    endDate: moment().add(2, 'day'),
    draftData: { name: { en: 'NewName' } }
  });

  // create survey sections
  [surveySection] = await Promise.all([
    surveySectionFactory({
      company,
      team,
      survey,
      sortableId: 1,
      draftData: { name: { en: 'DraftDataName' } }
    }),
    surveySectionFactory({
      company,
      team,
      survey,
      sortableId: 0,
      draftRemove: true
    }) // should skip this section
  ]);

  // create question
  question = await questionFactory({
    company,
    team,
    type: 'dropdown',
    draftData: { name: { en: 'DraftDataName' } }
  });

  // create questionItems
  [
    item1,
    item2,
    item3
  ] = await Promise.all([
    questionItemFactory({
      company,
      team,
      sortableId: 0,
      question,
      draftData: { name: { en: 'DraftDataName1' } }
    }),
    questionItemFactory({
      company,
      team,
      sortableId: 1,
      question,
      draftData: { name: { en: 'DraftDataName2' } }
    }),
    questionItemFactory({
      company,
      team,
      sortableId: 3,
      question,
      draftData: { name: { en: 'DraftDataName3' } }
    }),
    questionItemFactory({
      company,
      team,
      sortableId: 2,
      question,
      draftRemove: true
    })
  ]);

  // create surveyItems
  [surveyItem] = await Promise.all([
    surveyItemFactory({
      company,
      team,
      surveySection,
      question,
      sortableId: 1,
      draftData: { name: { en: 'NewName' } }
    }),
    surveyItemFactory({
      company,
      team,
      surveySection,
      sortableId: 0,
      draftRemove: true
    })
  ]);

  // crate startPages
  [startPage] = await Promise.all([
    contentItemFactory({
      company,
      team,
      survey,
      type: 'startPage',
      default: false,
      draftData: { default: true }
    }),
    contentItemFactory({
      company,
      team,
      survey,
      type: 'startPage',
      default: true,
      draftData: { default: false }
    })
  ]);

  // create endPages
  [endPage] = await Promise.all([
    contentItemFactory({
      company,
      team,
      survey,
      type: 'endPage',
      default: false,
      draftData: { default: true }
    }),
    contentItemFactory({
      company,
      team,
      survey,
      type: 'endPage',
      default: true,
      draftData: { default: false }
    })
  ]);

  // create invite and survey result
  await Promise.all([
    surveyResultFactory({
      company,
      team,
      token,
      survey,
      preview: true,
      answer: { [surveyItem._id]: item1._id.toString() }
    }),
    inviteFactory({
      company,
      team,
      token,
      survey,
      preview: true,
      type: 'team'
    })
  ]);

  // create power User
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const user = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user, team, company });
}

describe('## GET /api/v1/survey-answers', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('As Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
      });

      it('should return survey preview first section', async () => {
        const res = await agent
          .get('/api/v1/survey-answers')
          .query({ token })
          .expect(httpStatus.OK);

        const { survey: resSurvey, answer } = res.body;

        // expect answer
        expect(answer).to.be.an('object');
        expect(answer[surveyItem._id]).to.be.eq(item1._id.toString());

        // expect survey
        expect(resSurvey).to.be.an('object');
        expect(resSurvey._id.toString()).to.be.eq(survey._id.toString());
        expect(resSurvey.name.en).to.be.eq(survey.draftData.name.en);

        // expect startPage
        const { startPage: resStartPage } = resSurvey;

        expect(resStartPage).to.be.an('object');
        expect(resStartPage._id.toString()).to.be.eq(startPage._id.toString());

        // expect surveySection
        const { surveySection: resSection } = resSurvey;

        expect(resSection).to.be.an('object');
        expect(resSection._id.toString()).to.be.eq(surveySection._id.toString());
        expect(resSection.surveyItems.length).to.be.eq(1);

        // expect surveyItem
        const [resSurveyItem] = resSection.surveyItems;

        expect(resSurveyItem).to.be.an('object');
        expect(resSurveyItem._id.toString()).to.be.eq(surveyItem._id.toString());
        expect(resSurveyItem.name.en).to.be.eq(surveyItem.draftData.name.en);

        // expect question
        const { question: resQuestion } = resSurveyItem;

        expect(resQuestion).to.be.an('object');
        expect(resQuestion._id.toString()).to.be.eq(question._id.toString());
        expect(resQuestion.name.en).to.be.eq(question.draftData.name.en);
        expect(resQuestion.questionItems.length).to.be.eq(3);

        // expect questionItems
        const [
          questionItem1,
          questionItem2,
          questionItem3,
        ] = resQuestion.questionItems;

        expect(questionItem1).to.be.an('object');
        expect(questionItem1._id.toString()).to.be.eq(item1._id.toString());
        expect(questionItem1.name.en).to.be.eq(item1.draftData.name.en);

        expect(questionItem2).to.be.an('object');
        expect(questionItem2._id.toString()).to.be.eq(item2._id.toString());
        expect(questionItem2.name.en).to.be.eq(item2.draftData.name.en);

        expect(questionItem3).to.be.an('object');
        expect(questionItem3._id.toString()).to.be.eq(item3._id.toString());
        expect(questionItem3.name.en).to.be.eq(item3.draftData.name.en);
      });

      it('should return default endPage', async () => {
        const token = uuid();

        await Promise.all([
          surveyResultFactory({
            company,
            team,
            token,
            survey,
            preview: true,
            completed: true
          }),
          inviteFactory({
            company,
            team,
            token,
            survey,
            preview: true,
            type: 'team'
          })
        ]);

        const res = await agent
          .get('/api/v1/survey-answers')
          .query({ token })
          .expect(httpStatus.OK);

        expect(res.body.survey.newEndPage).to.be.an('object');
        expect(res.body.survey.newEndPage._id.toString()).to.be.eq(endPage._id.toString());
      });

      it('should return endPage by condition', async () => {
        const token = uuid();
        const survey = await surveyFactory({ company, team, surveyType: 'quiz' });

        // create endPage
        const endPage = await contentItemFactory({
          company,
          team,
          survey,
          type: 'endPage'
        });

        // create flowItem
        await flowItemFactory({
          survey,
          endPage,
          questionType: 'endPage',
          condition: 'less',
          count: 3,
          draftData: { condition: 'range', range: { from: 5, to: 10 } },
        });

        // create preview surveyResult and invite
        await Promise.all([
          surveyResultFactory({
            company,
            team,
            token,
            survey,
            preview: true,
            completed: true,
            quizCorrect: 6
          }),
          inviteFactory({
            company,
            team,
            token,
            survey,
            preview: true,
            type: 'team'
          })
        ]);

        const res = await agent
          .get('/api/v1/survey-answers')
          .query({ token })
          .expect(httpStatus.OK);

        expect(res.body.survey.newEndPage._id.toString()).to.be.eq(endPage._id.toString());
      });
    });

    describe('As Team User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should return survey preview first section', async () => {
        const res = await agent
          .get('/api/v1/survey-answers')
          .query({ token })
          .expect(httpStatus.OK);

        const { survey: resSurvey, answer } = res.body;

        // expect answer
        expect(answer).to.be.an('object');
        expect(answer[surveyItem._id]).to.be.eq(item1._id.toString());

        // expect survey
        expect(resSurvey).to.be.an('object');
        expect(resSurvey._id.toString()).to.be.eq(survey._id.toString());
        expect(resSurvey.name.en).to.be.eq(survey.draftData.name.en);

        // expect startPage
        const { startPage: resStartPage } = resSurvey;

        expect(resStartPage).to.be.an('object');
        expect(resStartPage._id.toString()).to.be.eq(startPage._id.toString());

        // expect surveySection
        const { surveySection: resSection } = resSurvey;

        expect(resSection).to.be.an('object');
        expect(resSection._id.toString()).to.be.eq(surveySection._id.toString());
        expect(resSection.surveyItems.length).to.be.eq(1);

        // expect surveyItem
        const [resSurveyItem] = resSection.surveyItems;

        expect(resSurveyItem).to.be.an('object');
        expect(resSurveyItem._id.toString()).to.be.eq(surveyItem._id.toString());
        expect(resSurveyItem.name.en).to.be.eq(surveyItem.draftData.name.en);

        // expect question
        const { question: resQuestion } = resSurveyItem;

        expect(resQuestion).to.be.an('object');
        expect(resQuestion._id.toString()).to.be.eq(question._id.toString());
        expect(resQuestion.name.en).to.be.eq(question.draftData.name.en);
        expect(resQuestion.questionItems.length).to.be.eq(3);

        // expect questionItems
        const [
          questionItem1,
          questionItem2,
          questionItem3,
        ] = resQuestion.questionItems;

        expect(questionItem1).to.be.an('object');
        expect(questionItem1._id.toString()).to.be.eq(item1._id.toString());
        expect(questionItem1.name.en).to.be.eq(item1.draftData.name.en);

        expect(questionItem2).to.be.an('object');
        expect(questionItem2._id.toString()).to.be.eq(item2._id.toString());
        expect(questionItem2.name.en).to.be.eq(item2.draftData.name.en);

        expect(questionItem3).to.be.an('object');
        expect(questionItem3._id.toString()).to.be.eq(item3._id.toString());
        expect(questionItem3.name.en).to.be.eq(item3.draftData.name.en);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get('/api/v1/survey-answers')
        .query({ token })
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return survey preview first section for global preview invite', async () => {
      const token = uuid();

      // create global invite and surveyResult
      await Promise.all([
        surveyResultFactory({
          token,
          survey,
          preview: true,
          answer: { [surveyItem._id]: item1._id.toString() }
        }),
        inviteFactory({
          token,
          survey,
          preview: true,
          type: 'global'
        })
      ]);

      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ token })
        .expect(httpStatus.OK);

      const { survey: resSurvey, answer } = res.body;

      // expect answer
      expect(answer).to.be.an('object');
      expect(answer[surveyItem._id]).to.be.eq(item1._id.toString());

      // expect survey
      expect(resSurvey).to.be.an('object');
      expect(resSurvey._id.toString()).to.be.eq(survey._id.toString());
      expect(resSurvey.name.en).to.be.eq(survey.draftData.name.en);

      // expect startPage
      const { startPage: resStartPage } = resSurvey;

      expect(resStartPage).to.be.an('object');
      expect(resStartPage._id.toString()).to.be.eq(startPage._id.toString());

      // expect surveySection
      const { surveySection: resSection } = resSurvey;

      expect(resSection).to.be.an('object');
      expect(resSection._id.toString()).to.be.eq(surveySection._id.toString());
      expect(resSection.surveyItems.length).to.be.eq(1);

      // expect surveyItem
      const [resSurveyItem] = resSection.surveyItems;

      expect(resSurveyItem).to.be.an('object');
      expect(resSurveyItem._id.toString()).to.be.eq(surveyItem._id.toString());
      expect(resSurveyItem.name.en).to.be.eq(surveyItem.draftData.name.en);

      // expect question
      const { question: resQuestion } = resSurveyItem;

      expect(resQuestion).to.be.an('object');
      expect(resQuestion._id.toString()).to.be.eq(question._id.toString());
      expect(resQuestion.name.en).to.be.eq(question.draftData.name.en);
      expect(resQuestion.questionItems.length).to.be.eq(3);

      // expect questionItems
      const [
        questionItem1,
        questionItem2,
        questionItem3,
      ] = resQuestion.questionItems;

      expect(questionItem1).to.be.an('object');
      expect(questionItem1._id.toString()).to.be.eq(item1._id.toString());
      expect(questionItem1.name.en).to.be.eq(item1.draftData.name.en);

      expect(questionItem2).to.be.an('object');
      expect(questionItem2._id.toString()).to.be.eq(item2._id.toString());
      expect(questionItem2.name.en).to.be.eq(item2.draftData.name.en);

      expect(questionItem3).to.be.an('object');
      expect(questionItem3._id.toString()).to.be.eq(item3._id.toString());
      expect(questionItem3.name.en).to.be.eq(item3.draftData.name.en);
    });
  });
});
