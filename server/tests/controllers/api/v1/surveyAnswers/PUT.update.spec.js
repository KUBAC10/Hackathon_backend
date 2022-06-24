import request from 'supertest';
import uuid from 'uuid/v4';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';
import moment from 'moment';
import faker from 'faker';

// factories
import {
  surveyFactory,
  surveyResultFactory,
  surveyItemFactory,
  surveySectionFactory,
  contentFactory,
  inviteFactory,
  contactFactory,
  gridColumnFactory,
  gridRowFactory,
  questionFactory,
  assetFactory,
  companyFactory,
  teamFactory,
  questionItemFactory,
  flowItemFactory,
  flowLogicFactory,
  contentItemFactory
} from '../../../../factories';

// models
import {
  SurveyResult,
  Survey
} from '../../../../../models';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

// services
import { APIMessagesExtractor } from '../../../../../services';

chai.config.includeStack = true;

// TODO: Split all tests below on describes
let token1;
let token2;
let token3;
let token4;
let token5;
let token6;

let survey;
let survey2;
let publicSurvey;
let surveyWithOneSection;
let gridSurvey;
let surveyWithStatusBar;
let publicSurveyStatusBar;

let answer;
let gridQuestion;

let pub1;
let pub2;
let pub3;

let pub4;
let pub5;
let pub6;
let pub7;
let pub8;
let pub9;
let pub10;

let item1;
let item2;
let item3;

let item4;
let item5;
let item6;

let item9;
let item10;
let item11;
let item12;
let item13;

let item14;
let item15;
let item16;
let item17;
let item18;
let item19;
let item20;
let item21;
let item22;
let item23;
let item24;

let gridRow1;
let gridRow2;
let gridRow3;
let gridItem;
let gridColumn1;
let gridColumn2;
let gridColumn3;

let content;
let contact;
let company;
let team;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  const question = await questionFactory({ team });

  // create survey with survey result
  [
    survey,
    survey2,
    publicSurvey,
    surveyWithOneSection,
    gridSurvey,
    surveyWithStatusBar,
    publicSurveyStatusBar
  ] = await Promise.all([
    surveyFactory({ team, statusBar: true, allowReAnswer: true }),
    surveyFactory({ team }),
    surveyFactory({ team, publicAccess: true }),
    surveyFactory({ team }),
    surveyFactory({ team }),
    surveyFactory({ team, statusBar: true, endPage: { active: true, text: { en: 'Success' } } }),
    surveyFactory({ team, statusBar: true, publicAccess: true })
  ]);

  const [
    section1,
    section2,
    section3,
    section4,
    section5,
    section6,
    section7,
    section8,
    section9,
    section10,
    publicSection,
    gridSection
  ] = await Promise.all([
    surveySectionFactory({ team, survey, sortableId: 0 }),
    surveySectionFactory({ team, survey, sortableId: 1 }),
    surveySectionFactory({ team, survey, sortableId: 3 }),
    surveySectionFactory({ team, survey: surveyWithOneSection }),
    surveySectionFactory({ team, survey: surveyWithStatusBar, sortableId: 0 }),
    surveySectionFactory({ team, survey: surveyWithStatusBar, sortableId: 1 }),
    surveySectionFactory({ team, survey: surveyWithStatusBar, sortableId: 2 }),
    surveySectionFactory({ team, survey: publicSurveyStatusBar, sortableId: 0 }),
    surveySectionFactory({ team, survey: publicSurveyStatusBar, sortableId: 1 }),
    surveySectionFactory({ team, survey: publicSurveyStatusBar, sortableId: 2 }),
    surveySectionFactory({ team, survey: publicSurvey }),
    surveySectionFactory({ team, survey: gridSurvey })
  ]);

  [
    pub1,
    pub2,
    pub3,
    pub4,
    pub5,
    pub6,
    pub7,
    pub8,
    pub9,
    pub10,

    item1,
    item2,
    item3,
    item4,
    item5,
    item6,
    item9,
    item10,
    item11,
    item12,
    item13,
    item14,
    item15,
    item16,
    item17,
    item18,
    item19,
    item20,
    item21,
    item22,
    item23,
    item24
  ] = await Promise.all([
    surveyItemFactory({ team, question, survey: publicSurvey, surveySection: publicSection }),
    surveyItemFactory({ team, question, survey: publicSurvey, surveySection: publicSection }),
    surveyItemFactory({ team, question, survey: publicSurvey, surveySection: publicSection }),
    surveyItemFactory({ team, question, survey: publicSurveyStatusBar, surveySection: section8 }),
    surveyItemFactory({ team, question, survey: publicSurveyStatusBar, surveySection: section8 }),
    surveyItemFactory({ team, question, survey: publicSurveyStatusBar, surveySection: section9 }),
    surveyItemFactory({ team, question, survey: publicSurveyStatusBar, surveySection: section9 }),
    surveyItemFactory({ team, question, survey: publicSurveyStatusBar, surveySection: section9 }),
    surveyItemFactory({ team, question, survey: publicSurveyStatusBar, surveySection: section10 }),
    surveyItemFactory({ team, question, survey: publicSurveyStatusBar, surveySection: section10 }),

    surveyItemFactory({ team, question, survey, surveySection: section1 }),
    surveyItemFactory({ team, question, survey, surveySection: section1 }),
    surveyItemFactory({ team, question, survey, surveySection: section1 }),
    surveyItemFactory({ team, question, survey, surveySection: section2 }),
    surveyItemFactory({ team, question, survey, surveySection: section2 }),
    surveyItemFactory({ team, question, survey, surveySection: section2 }),
    surveyItemFactory({ team, question, survey: surveyWithOneSection, surveySection: section4 }),
    surveyItemFactory({ team, question, survey: surveyWithOneSection, surveySection: section4 }),
    surveyItemFactory({ team, question, survey: surveyWithOneSection, surveySection: section4 }),
    surveyItemFactory({ team, question, survey: surveyWithOneSection, surveySection: section4 }),
    surveyItemFactory({
      team,
      question,
      survey:
      surveyWithOneSection,
      required: true,
      surveySection: section4,
      textLimit: 7
    }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section5 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section5 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section5 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section5 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section6 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section6 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section6 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section6 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section7 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section7 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section7 }),

    surveyItemFactory({ team, question, survey, surveySection: section3 }),
    surveyItemFactory({ team, question, survey, surveySection: section3 })
  ]);

  gridQuestion = await questionFactory({ team, type: 'multipleChoiceMatrix' });

  // create grid question
  [
    gridRow1,
    gridRow2,
    gridRow3,
    gridColumn1,
    gridColumn2,
    gridColumn3
  ] = await Promise.all([
    gridRowFactory({ team, question: gridQuestion }),
    gridRowFactory({ team, question: gridQuestion }),
    gridRowFactory({ team, question: gridQuestion }),
    gridColumnFactory({ team, question: gridQuestion }),
    gridColumnFactory({ team, question: gridQuestion }),
    gridColumnFactory({ team, question: gridQuestion })
  ]);

  gridItem = await surveyItemFactory({
    team,
    survey: gridSurvey,
    question: gridQuestion,
    surveySection: gridSection,
    required: true
  });

  token1 = uuid();
  token2 = uuid();
  token3 = uuid(); // for completed survey result
  token4 = uuid(); // for survey with greed question
  token5 = uuid();
  token6 = uuid();

  answer = {
    [item2._id]: 'hello world',
    [item3._id]: 'string'
  };

  contact = await contactFactory({ team });

  // create survey result for surveys
  await Promise.all([
    surveyResultFactory({ team, survey, token: token1 }),
    surveyResultFactory({ team, survey: surveyWithOneSection, token: token2 }),
    surveyResultFactory({ team, survey: surveyWithOneSection, token: token3, completed: true }),
    surveyResultFactory({ team, survey: publicSurvey, fingerprintId: 'validId' }),
    surveyResultFactory({ team, survey: gridSurvey, token: token4 }),
    surveyResultFactory({ team, survey: surveyWithOneSection, token: token5, step: 2 }),
    surveyResultFactory({ team, survey: survey2, token: token6 }),

    inviteFactory({ team, survey, token: token1, contact }),
    inviteFactory({ team, survey: surveyWithOneSection, token: token2, contact }),
    inviteFactory({ team, survey: surveyWithOneSection, token: token3, contact }),
    inviteFactory({ team, survey: gridSurvey, token: token4, contact }),
    inviteFactory({ team, survey: surveyWithOneSection, token: token5, contact }),
    inviteFactory({ team, survey: survey2, token: token6, contact })
  ]);
}

describe('## PUT /api/v1/survey-answers', () => {
  before(cleanData);

  before(async () => {
    [content] = await Promise.all([
      contentFactory({}),
      makeTestData()
    ]);

    await APIMessagesExtractor.loadData();
  });

  describe('By token', () => {
    it('should return isExpired true on expired token', async () => {
      const token = uuid();

      await Promise.all([
        surveyResultFactory({ survey, token, preview: true }),
        inviteFactory({ survey, token, ttl: 1 })
      ]);

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer,
          token,
        })
        .expect(httpStatus.OK);

      expect(res.body.isExpired).to.be.eq(true);
    });

    it('should return not found error when survey result was not found by token', async () => {
      await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer,
          token: 'wrongToken',
        })
        .expect(httpStatus.NOT_FOUND);
    });

    it('should return unprocessable entity error for wrong survey item ids', async () => {
      const wrongAnswer = {
        [item5._id]: 'hello',
        [item6._id]: 'world'
      };

      await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token: token1,
          answer: wrongAnswer
        })
        .expect(httpStatus.UNPROCESSABLE_ENTITY);
    });

    it('should return error when one of required items was not present in answer', async () => {
      const answerWithOneSection = {
        [item9._id]: 'hello',
        [item10._id]: 'world',
        [item11._id]: 'test',
        [item12._id]: 'text',
      };

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token: token2,
          answer: answerWithOneSection
        })
        .expect(httpStatus.BAD_REQUEST);
      expect(res.body.message[item13._id]).to.be.eq('Is required');
    });

    it('should return error when text greater then textLimit', async () => {
      const answerWithOneSection = {
        [item9._id]: 'hello',
        [item10._id]: 'world',
        [item11._id]: 'test',
        [item12._id]: 'text',
        [item13._id]: 'qqqqqqqqqweqwe'
      };

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token: token2,
          answer: answerWithOneSection
        })
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message[item13._id]).to.be.eq(`${content.apiErrors.global.textLimit}: 7`);
    });

    it('should create result answer and return status OK with message for survey with one section and don`t change result step', async () => {
      const answerWithOneSection = {
        [item9._id]: 'hello',
        [item10._id]: 'world',
        [item11._id]: 'test',
        [item12._id]: 'text',
        [item13._id]: 'qwerty'
      };

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token: token2,
          answer: answerWithOneSection,
          useragent: {
            isDesktop: true,
            isMobile: false
          }
        })
        .expect(httpStatus.OK);

      // reload result
      const reloadedResult = await SurveyResult.model
        .findOne({
          token: token2,
          survey: surveyWithOneSection
        })
        .lean();

      expect(res.body.message).to.be.eq(content.apiMessages.survey.isCompleted);
      expect(reloadedResult.step).to.be.eq(0);
      expect(reloadedResult.device).to.be.eq('isDesktop');
      expect(Object.keys(reloadedResult.answer).length).to.be.eq(7);
    });

    it('Should return error when receive an answer for a hidden question', async () => {
      const token = uuid();
      const survey = await surveyFactory({});
      const surveySection1 = await surveySectionFactory({ survey, sortableId: 0 });
      const surveyItem1 = await surveyItemFactory({
        survey,
        surveySection: surveySection1,
        hide: true
      });

      await surveyResultFactory({ survey, token, contact });
      await inviteFactory({ survey, token, contact });
      const answer = {
        [surveyItem1._id]: 'hello'
      };

      await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token,
          answer
        })
        .expect(httpStatus.UNPROCESSABLE_ENTITY);
    });

    it('Should return completed survey skipping hidden second section', async () => {
      const token = uuid();
      const survey = await surveyFactory({ statusBar: true });
      const [
        surveySection1
      ] = await Promise.all([
        surveySectionFactory({ survey, sortableId: 0 }),
        surveySectionFactory({ survey, sortableId: 1, hide: true })
      ]);

      const surveyItem1 = await surveyItemFactory({ survey, surveySection: surveySection1 });

      await surveyResultFactory({ survey, token, contact });
      await inviteFactory({ survey, token, contact });

      const answer = {
        [surveyItem1._id]: 'hello'
      };
      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token,
          answer
        })
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq(content.apiMessages.survey.isCompleted);
      expect(res.body.statusBarData.passed).to.be.eq(0);
      expect(res.body.statusBarData.total).to.be.eq(1);
    });

    it('Should return completed survey if all required fields are hidden', async () => {
      const token = uuid();
      const survey = await surveyFactory({ statusBar: true });
      const surveySection1 = await surveySectionFactory({ survey, sortableId: 0 });

      const [
        surveyItem1,
      ] = await Promise.all([
        surveyItemFactory({ survey, surveySection: surveySection1 }),
        surveyItemFactory({
          survey,
          surveySection: surveySection1,
          required: true,
          hide: true
        }),
        surveyItemFactory({
          survey,
          surveySection: surveySection1,
          required: true,
          hide: true
        })
      ]);

      await surveyResultFactory({ survey, token, contact });
      await inviteFactory({ survey, token, contact });

      const answer = {
        [surveyItem1._id]: 'hello'
      };

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token,
          answer
        })
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq(content.apiMessages.survey.isCompleted);
      expect(res.body.statusBarData.passed).to.be.eq(0);
      expect(res.body.statusBarData.total).to.be.eq(1);
    });

    it('Should return error when gets an answer for question from a hidden section', async () => {
      const token = uuid();
      const survey = await surveyFactory({ statusBar: true });
      const [
        surveySection1
      ] = await Promise.all([
        surveySectionFactory({ survey, sortableId: 0, hide: true }),
        surveySectionFactory({ survey, sortableId: 1 })
      ]);

      const surveyItem1 = await surveyItemFactory({ survey, surveySection: surveySection1 });
      await surveyResultFactory({ survey, token, contact });
      await inviteFactory({ survey, token, contact });

      const answer = {
        [surveyItem1._id]: 'hello'
      };

      await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token,
          answer
        })
        .expect(httpStatus.UNPROCESSABLE_ENTITY);
    });

    it('should increment survey result step for surveys with multiple sections and return survey with new items by step', async () => {
      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer,
          token: token1
        })
        .expect(httpStatus.OK);
      // reload result
      const reloadedResult = await SurveyResult.model
        .findOne({
          survey
        })
        .lean();

      expect(res.body.statusBarData.passed).to.be.eq(3);
      expect(res.body.statusBarData.total).to.be.eq(8);
      expect(reloadedResult.step).to.be.eq(1);
      expect(Object.keys(reloadedResult.answer).length).to.be.eq(4);

      const newItemsIds = res.body.survey.surveySection.surveyItems.map(i => i._id.toString());
      expect(newItemsIds.length).to.be.eq(3);
      expect(newItemsIds).to.include.members([
        item4._id.toString(),
        item5._id.toString(),
        item6._id.toString(),
      ]);
    });

    it('should update survey result answer', async () => {
      const token = uuid();

      await Promise.all([
        surveyResultFactory({
          token,
          contact,
          survey,
          step: 0,
          answer: {
            [item2._id]: { value: 'a' },
            [item3._id]: { value: 'b' },
            skipped: [item2._id.toString()]
          }
        }),
        inviteFactory({ token, contact, survey })
      ]);

      await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token,
          answer: {
            [item2._id]: 'world',
            [item3._id]: 'test',
          }
        })
        .expect(httpStatus.OK);

      const reloadSurveyResult = await SurveyResult.model
        .findOne({ token })
        .lean();

      expect(reloadSurveyResult.answer[item2._id].value).to.be.eq('world');
      expect(reloadSurveyResult.answer[item3._id].value).to.be.eq('test');
      expect(reloadSurveyResult.answer.skipped.length).to.be.eq(1);
      expect(reloadSurveyResult.answer.skipped.includes(item1._id.toString())).to.be.eq(true);
    });

    it('should return message without any data for completed survey result', async () => {
      const answerWithoutBreakers = {
        [item9._id]: 'hello',
        [item10._id]: 'world',
        [item11._id]: 'test',
        [item12._id]: 'text',
        [item13._id]: 'qwerty'
      };

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token: token3,
          answer: answerWithoutBreakers
        })
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq(content.apiMessages.survey.isCompleted);
    });

    it('should return correct status bar data', async () => {
      const token = uuid();
      await inviteFactory({ survey: surveyWithStatusBar, token, contact });
      await surveyResultFactory({ survey: surveyWithStatusBar, token, contact });

      const answers = {
        [item14._id]: 'hello',
        [item15._id]: 'world',
        [item16._id]: 'test',
        [item17._id]: 'text',
      };

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token,
          answer: answers
        })
        .expect(httpStatus.OK);

      expect(res.body.statusBarData.passed).to.be.eq(4);
      expect(res.body.statusBarData.total).to.be.eq(11);
    });

    it('should return correct status bar data for next step', async () => {
      const token = uuid();
      await inviteFactory({ survey: surveyWithStatusBar, token, contact });
      await surveyResultFactory({ survey: surveyWithStatusBar, token, contact, step: 1 });

      const answers = {
        [item18._id]: 'hello',
        [item19._id]: 'world',
        [item20._id]: 'test',
        [item21._id]: 'text',
      };

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token,
          answer: answers
        })
        .expect(httpStatus.OK);

      expect(res.body.statusBarData.passed).to.be.eq(8);
      expect(res.body.statusBarData.total).to.be.eq(11);
    });

    it('should create result items with assets and return status OK', async () => {
      const token = uuid();
      const asset = await assetFactory({});
      await inviteFactory({ survey, token, contact });
      await surveyResultFactory({ survey, token, contact, assets: [asset] });
      const answer = {
        [item1._id]: 'hello',
        [item2._id]: 'world',
        [item3._id]: 'test',
      };
      await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token,
          answer,
          assets: [asset._id.toString()]
        })
        .expect(httpStatus.OK);
      const surveyResult = await SurveyResult.model.find({ survey, token }).lean();

      expect(surveyResult[0].assets.map(i => i.toString()))
        .to.include.members([asset._id.toString()]);
    });

    it('should return message survey is completed', async () => {
      const token = uuid();
      await inviteFactory({ survey: surveyWithStatusBar, token, contact });
      await surveyResultFactory({ survey: surveyWithStatusBar, token, contact, step: 2 });
      const answers = {
        [item22._id]: 'hello',
        [item23._id]: 'world',
        [item24._id]: 'test',
      };
      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token,
          answer: answers
        })
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq(content.apiMessages.survey.isCompleted);
    });

    it('should return message survey is expired (specified only end date)', async () => {
      const token = uuid();
      const survey = await surveyFactory({
        endDate: moment()
      });
      const surveySection = await surveySectionFactory({ survey });
      const item = await surveyItemFactory({ survey, surveySection });
      await inviteFactory({ survey, token, contact });
      await surveyResultFactory({ survey, token, contact });
      const answer = {
        [item._id]: 'hello',
      };
      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token,
          answer
        })
        .expect(httpStatus.OK);
      expect(res.body.message).to.be.eq(content.apiMessages.survey.expired);
    });

    it('should return message survey not started (specified only start date)', async () => {
      const token = uuid();
      const survey = await surveyFactory({
        startDate: moment().subtract(-10, 'days')
      });
      const surveySection = await surveySectionFactory({ survey });
      const item = await surveyItemFactory({ survey, surveySection });
      await inviteFactory({ survey, token, contact });
      await surveyResultFactory({ survey, token, contact });
      const answer = {
        [item._id]: 'hello',
      };
      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token,
          answer
        })
        .expect(httpStatus.OK);
      expect(res.body.message).to.be.eq(content.apiMessages.survey.notStarted);
    });

    it('should return message survey is not started (specified start and end date)', async () => {
      const token = uuid();
      const survey = await surveyFactory({
        startDate: moment().subtract(-10, 'days'),
        endDate: moment().subtract(-20, 'days')
      });
      const surveySection = await surveySectionFactory({ survey });
      const item = await surveyItemFactory({ survey, surveySection });
      await inviteFactory({ survey, token, contact });
      await surveyResultFactory({ survey, token, contact });
      const answer = {
        [item._id]: 'hello',
      };
      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token,
          answer
        })
        .expect(httpStatus.OK);
      expect(res.body.message).to.be.eq(content.apiMessages.survey.notStarted);
    });

    it('should return message survey is expired (specified start and end date)', async () => {
      const token = uuid();
      const survey = await surveyFactory({
        startDate: moment().subtract(20, 'days'),
        endDate: moment().subtract(10, 'days')
      });
      const surveySection = await surveySectionFactory({ survey });
      const item = await surveyItemFactory({ survey, surveySection });
      await inviteFactory({ survey, token, contact });
      await surveyResultFactory({ survey, token, contact });
      const answer = {
        [item._id]: 'hello',
      };
      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token,
          answer
        })
        .expect(httpStatus.OK);
      expect(res.body.message).to.be.eq(content.apiMessages.survey.expired);
    });

    describe('With custom answer', () => {
      let questionItem1;
      let questionItem2;
      let surveyItem;
      let question;
      let survey;

      before(async () => {
        survey = await surveyFactory({});
        const surveySection = await surveySectionFactory({ survey });
        question = await questionFactory({ type: 'checkboxes' });
        [
          questionItem1,
          questionItem2,
          surveyItem
        ] = await Promise.all([
          questionItemFactory({ question }),
          questionItemFactory({ question }),
          surveyItemFactory({ question, surveySection, customAnswer: true, required: true }),
        ]);
      });

      it('should create answer with custom answer', async () => {
        const token = uuid();
        await Promise.all([
          inviteFactory({ survey, contact, token }),
          surveyResultFactory({ survey, token })
        ]);

        await request(app)
          .put('/api/v1/survey-answers')
          .send({
            token,
            answer: {
              [surveyItem._id]: [questionItem1._id.toString(), questionItem2._id.toString()],
              [`${surveyItem._id}_customAnswer`]: 'My variant'
            }
          })
          .expect(httpStatus.OK);
      });

      it('should create answer if item is required but send custom answer', async () => {
        const token = uuid();
        await Promise.all([
          inviteFactory({ survey, contact, token }),
          surveyResultFactory({ survey, token })
        ]);

        await request(app)
          .put('/api/v1/survey-answers')
          .send({
            token,
            answer: { [`${surveyItem._id}_customAnswer`]: 'My variant' }
          })
          .expect(httpStatus.OK);

        // reload and expect survey result item
        const surveyResult = await SurveyResult.model
          .findOne({ token })
          .lean();

        expect(surveyResult.answer[surveyItem._id].customAnswer).to.be.eq('My variant');
      });

      it('should remove question items in result and add custom answer', async () => {
        const token = uuid();
        await Promise.all([
          inviteFactory({ survey, contact, token }),
          surveyResultFactory({ survey, token })
        ]);

        await request(app)
          .put('/api/v1/survey-answers')
          .send({
            token,
            answer: {
              [surveyItem._id]: [questionItem1._id.toString(), questionItem2._id.toString()]
            },
          })
          .expect(httpStatus.OK);

        await request(app)
          .put('/api/v1/survey-answers')
          .send({
            token,
            answer: { [`${surveyItem._id}_customAnswer`]: 'My variant' }
          })
          .expect(httpStatus.OK);

        // expect survey result
        const surveyResult = await SurveyResult.model
          .findOne({ token })
          .lean();

        expect(surveyResult.answer[surveyItem._id].questionItems).to.be.an('undefined');
        expect(surveyResult.answer[surveyItem._id].customAnswer).to.be.eq('My variant');
      });

      it('should return error if answer is required', async () => {
        const token = uuid();
        await Promise.all([
          inviteFactory({ survey, contact, token }),
          surveyResultFactory({ survey, token })
        ]);

        const res = await request(app)
          .put('/api/v1/survey-answers')
          .send({
            token,
            answer: {}
          })
          .expect(httpStatus.BAD_REQUEST);

        expect(res.body.message[surveyItem._id.toString()]).to.be.eq('Is required');
      });
    });

    describe('Min-Max survey item answer configuration', () => {
      let company;
      let team;
      let checkboxSurvey;
      let surveyItem1;
      let surveyItem2;
      let qI1;
      let qI2;
      let qI3;
      let qI4;
      before(async () => {
        company = await companyFactory({});
        team = await teamFactory({ company });
        checkboxSurvey = await surveyFactory({ team, company });
        const surveySection = await surveySectionFactory({ team, company, survey: checkboxSurvey });
        const question = await questionFactory({ company, team, type: 'checkboxes' });
        surveyItem1 = await surveyItemFactory({
          company,
          team,
          surveySection,
          question,
          minAnswers: 2,
          maxAnswers: 3
        });
        surveyItem2 = await surveyItemFactory({
          company,
          team,
          surveySection,
          question,
          minAnswers: 1,
          maxAnswers: 2
        });
        [
          qI1,
          qI2,
          qI3,
          qI4
        ] = await Promise.all([
          questionItemFactory({ question }),
          questionItemFactory({ question }),
          questionItemFactory({ question }),
          questionItemFactory({ question })
        ]);
      });
      describe('check validation of min and max answers', () => {
        let token;
        beforeEach(async () => {
          token = uuid();
          await inviteFactory({ company, team, survey: checkboxSurvey, token, contact });
          await surveyResultFactory({ company, team, survey: checkboxSurvey, token, contact });
        });

        it('should update survey answers with valid count of answers', async () => {
          const answer = {
            [surveyItem1._id]: [
              qI1._id.toString(),
              qI2._id.toString(),
              qI3._id.toString()
            ],
            [surveyItem2._id]: [
              qI1._id.toString(),
              qI2._id.toString()
            ]
          };

          const res = await request(app)
            .put('/api/v1/survey-answers')
            .send({
              answer,
              token
            })
            .expect(httpStatus.OK);

          expect(res.body.message).to.be.eq(content.apiMessages.survey.isCompleted);
        });

        it('should return error when answers is less than min answers', async () => {
          const answer = {
            [surveyItem1._id]: [
              qI1._id.toString()
            ],
            [surveyItem2._id]: []
          };

          const res = await request(app)
            .put('/api/v1/survey-answers')
            .send({
              answer,
              token
            })
            .expect(httpStatus.BAD_REQUEST);

          expect(res.body.message[surveyItem1._id]).to.be.eq(`${content.apiErrors.global.lessThanMinimum}: ${surveyItem1.minAnswers}`);
          expect(res.body.message[surveyItem2._id]).to.be.eq(`${content.apiErrors.global.lessThanMinimum}: ${surveyItem2.minAnswers}`);
        });

        it('should return error when answers greater than max answers', async () => {
          const answer = {
            [surveyItem1._id]: [
              qI1._id.toString(),
              qI2._id.toString(),
              qI3._id.toString(),
              qI4._id.toString()
            ],
            [surveyItem2._id]: [
              qI1._id.toString(),
              qI2._id.toString(),
              qI3._id.toString()
            ]
          };

          const res = await request(app)
            .put('/api/v1/survey-answers')
            .send({
              answer,
              token
            })
            .expect(httpStatus.BAD_REQUEST);

          expect(res.body.message[surveyItem1._id]).to.be.eq(`${content.apiErrors.global.moreThanMaximum}: ${surveyItem1.maxAnswers}`);
          expect(res.body.message[surveyItem2._id]).to.be.eq(`${content.apiErrors.global.moreThanMaximum}: ${surveyItem2.maxAnswers}`);
        });
      });
    });

    describe('Grid answer', () => {
      it('should return error for wrong row id', async () => {
        const answer = {
          [gridItem._id]: [{ row: gridSurvey._id, column: gridColumn1._id }]
        };

        await request(app)
          .put('/api/v1/survey-answers')
          .send({
            answer,
            token: token4
          })
          .expect(httpStatus.BAD_REQUEST);
      });

      it('should return error for wrong column id', async () => {
        const answer = {
          [gridItem._id]: [{ row: gridRow1._id, column: gridRow1._id }]
        };

        await request(app)
          .put('/api/v1/survey-answers')
          .send({
            answer,
            token: token4
          })
          .expect(httpStatus.BAD_REQUEST);
      });

      it('should return error for each not included rows in required question', async () => {
        const answer = {
          [gridItem._id]: [
            { row: gridRow1._id, column: gridColumn1._id },
          ]
        };

        const res = await request(app)
          .put('/api/v1/survey-answers')
          .send({
            answer,
            token: token4
          })
          .expect(httpStatus.BAD_REQUEST);

        expect(res.body.message[gridItem._id][gridRow2._id]).to.be.eq('Please select at least one answer per line.');
        expect(res.body.message[gridItem._id][gridRow3._id]).to.be.eq('Please select at least one answer per line.');
      });

      it('should create new crossings for each row, column', async () => {
        const answer = {
          [gridItem._id]: [
            { row: gridRow1._id, column: gridColumn1._id },
            { row: gridRow1._id, column: gridColumn2._id },
            { row: gridRow1._id, column: gridColumn3._id },
            { row: gridRow2._id, column: gridColumn1._id },
            { row: gridRow3._id, column: gridColumn1._id },
          ]
        };

        const res = await request(app)
          .put('/api/v1/survey-answers')
          .send({
            answer,
            token: token4
          })
          .expect(httpStatus.OK);

        expect(res.body.message).to.be.eq(content.apiMessages.survey.isCompleted);

        // reload survey result
        const reloadSurveyResult = await SurveyResult.model
          .findOne({ token: token4 })
          .lean();

        // get answer on matrix question
        const crossings = reloadSurveyResult.answer[gridItem._id].crossings;

        expect(crossings.length).to.be.eq(5);
        expect(crossings.find(c => c.gridRow === gridRow1._id.toString() && c.gridColumn === gridColumn1._id.toString())).to.be.an('object');
        expect(crossings.find(c => c.gridRow === gridRow1._id.toString() && c.gridColumn === gridColumn2._id.toString())).to.be.an('object');
        expect(crossings.find(c => c.gridRow === gridRow1._id.toString() && c.gridColumn === gridColumn3._id.toString())).to.be.an('object');
        expect(crossings.find(c => c.gridRow === gridRow2._id.toString() && c.gridColumn === gridColumn1._id.toString())).to.be.an('object');
        expect(crossings.find(c => c.gridRow === gridRow3._id.toString() && c.gridColumn === gridColumn1._id.toString())).to.be.an('object');
      });

      it('should return error when invalid current step', async () => {
        const answerWithOneSection = {
          [item9._id]: 'hello',
          [item10._id]: 'world',
          [item11._id]: 'test',
          [item12._id]: 'text',
        };
        await request(app)
          .put('/api/v1/survey-answers')
          .send({
            answer: answerWithOneSection,
            token: token5,
            surveyId: surveyWithOneSection._id.toString()
          })
          .expect(httpStatus.UNPROCESSABLE_ENTITY);
      });

      it('should return error when can not find survey', async () => {
        const answerWithOneSection = {
          [item9._id]: 'hello',
          [item10._id]: 'world',
          [item11._id]: 'test',
          [item12._id]: 'text',
        };
        await Survey.model.deleteOne({ _id: survey2._id.toString() });
        await request(app)
          .put('/api/v1/survey-answers')
          .send({
            answer: answerWithOneSection,
            token: token6,
            surveyId: survey2._id.toString()
          })
          .expect(httpStatus.NOT_FOUND);
      });
    });

    describe('Text question input', () => {
      let survey;
      let itemNumber;
      let itemPhone;
      let itemEmail;

      before(async () => {
        survey = await surveyFactory({ team, company });

        const surveySection = await surveySectionFactory({ survey });

        const [
          questionNumber,
          questionPhone,
          questionEmail
        ] = await Promise.all([
          questionFactory({ team, company, type: 'text', input: 'number', from: -10, to: 10 }),
          questionFactory({ team, company, type: 'text', input: 'phone' }),
          questionFactory({ team, company, type: 'text', input: 'email' })
        ]);

        [
          itemNumber,
          itemPhone,
          itemEmail
        ] = await Promise.all([
          surveyItemFactory({ company, team, survey, surveySection, question: questionNumber }),
          surveyItemFactory({ company, team, survey, surveySection, question: questionPhone }),
          surveyItemFactory({ company, team, survey, surveySection, question: questionEmail })
        ]);
      });

      it('should return error validation error on number type', async () => {
        const token = uuid();

        await Promise.all([
          inviteFactory({ team, company, token, survey }),
          surveyResultFactory({ team, company, survey, token })
        ]);

        const res = await request(app)
          .put('/api/v1/survey-answers')
          .send({
            token,
            answer: {
              [itemNumber._id]: 'text'
            }
          })
          .expect(httpStatus.BAD_REQUEST);

        expect(res.body.message[itemNumber._id]).to.be.eq(content.apiErrors.question.isFloat);
      });

      it('should return error validation error on number type with min limit', async () => {
        const token = uuid();

        await Promise.all([
          inviteFactory({ team, company, token, survey }),
          surveyResultFactory({ team, company, survey, token })
        ]);

        const res = await request(app)
          .put('/api/v1/survey-answers')
          .send({
            token,
            answer: {
              [itemNumber._id]: '-11'
            }
          })
          .expect(httpStatus.BAD_REQUEST);

        expect(res.body.message[itemNumber._id]).to.be.eq(`${content.apiErrors.question.lessThenLimit}: -10`);
      });

      it('should return error validation error on number type with max limit', async () => {
        const token = uuid();

        await Promise.all([
          inviteFactory({ team, company, token, survey }),
          surveyResultFactory({ team, company, survey, token })
        ]);

        const res = await request(app)
          .put('/api/v1/survey-answers')
          .send({
            token,
            answer: {
              [itemNumber._id]: '11'
            }
          })
          .expect(httpStatus.BAD_REQUEST);

        expect(res.body.message[itemNumber._id]).to.be.eq(`${content.apiErrors.question.greaterThenLimit}: 10`);
      });

      it('should return error validation error on email type', async () => {
        const token = uuid();

        await Promise.all([
          inviteFactory({ team, company, token, survey }),
          surveyResultFactory({ team, company, survey, token })
        ]);

        const res = await request(app)
          .put('/api/v1/survey-answers')
          .send({
            token,
            answer: {
              [itemEmail._id]: 'text'
            }
          })
          .expect(httpStatus.BAD_REQUEST);

        expect(res.body.message[itemEmail._id]).to.be.eq(content.apiErrors.question.isEmail);
      });

      it('should answer on number input type', async () => {
        const token = uuid();

        await Promise.all([
          inviteFactory({ team, company, token, survey }),
          surveyResultFactory({ team, company, survey, token })
        ]);

        const res = await request(app)
          .put('/api/v1/survey-answers')
          .send({
            token,
            answer: {
              [itemNumber._id]: '5'
            }
          })
          .expect(httpStatus.OK);

        expect(res.body.message).to.be.eq(content.apiMessages.survey.isCompleted);
      });

      it('should answer on phone type', async () => {
        const token = uuid();

        await Promise.all([
          inviteFactory({ team, company, token, survey }),
          surveyResultFactory({ team, company, survey, token })
        ]);

        const res = await request(app)
          .put('/api/v1/survey-answers')
          .send({
            token,
            answer: {
              [itemPhone._id]: '380987594875'
            }
          })
          .expect(httpStatus.OK);

        expect(res.body.message).to.be.eq(content.apiMessages.survey.isCompleted);
      });

      it('should answer on email type', async () => {
        const token = uuid();

        await Promise.all([
          inviteFactory({ team, company, token, survey }),
          surveyResultFactory({ team, company, survey, token })
        ]);

        const res = await request(app)
          .put('/api/v1/survey-answers')
          .send({
            token,
            answer: {
              [itemEmail._id]: 'qwe@qwe.qwe'
            }
          })
          .expect(httpStatus.OK);

        expect(res.body.message).to.be.eq(content.apiMessages.survey.isCompleted);
      });
    });
  });

  describe('By fingerprintId', () => {
    it('should return error when result was not found by fingerprintId', async () => {
      await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer,
          fingerprintId: '123123',
          surveyId: publicSurvey._id.toString()
        })
        .expect(httpStatus.NOT_FOUND);
    });

    it('should accept and return data by valid params', async () => {
      const answer = {
        [pub1._id]: 0,
        [pub2._id]: 'hello world',
        [pub3._id]: 'string'
      };

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer,
          fingerprintId: 'validId',
          surveyId: publicSurvey._id.toString()
        })
        .expect(httpStatus.OK);
      expect(res.body.message).to.be.eq(content.apiMessages.survey.isCompleted);
    });

    it('should return correct status bar data', async () => {
      await surveyResultFactory({ survey: publicSurveyStatusBar, fingerprintId: 'validId2' });
      const answers = {
        [pub4._id]: 'hello',
        [pub5._id]: 'world',
      };
      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer: answers,
          fingerprintId: 'validId2',
          surveyId: publicSurveyStatusBar._id.toString(),
        })
        .expect(httpStatus.OK);

      expect(res.body.statusBarData.passed).to.be.eq(2);
      expect(res.body.statusBarData.total).to.be.eq(7);
    });

    it('should return correct status bar data for next step', async () => {
      await surveyResultFactory({
        survey: publicSurveyStatusBar,
        fingerprintId: 'validId3',
        step: 1
      });
      const answers = {
        [pub6._id]: 'hello',
        [pub7._id]: 'world',
        [pub8._id]: 'test',
      };

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          surveyId: publicSurveyStatusBar._id.toString(),
          fingerprintId: 'validId3',
          answer: answers
        })
        .expect(httpStatus.OK);

      expect(res.body.statusBarData.passed).to.be.eq(5);
      expect(res.body.statusBarData.total).to.be.eq(7);
    });

    it('should return correct status bar data for last step', async () => {
      await surveyResultFactory({
        survey: publicSurveyStatusBar,
        fingerprintId: 'validId4',
        step: 2
      });
      const answers = {
        [pub9._id]: 'hello',
        [pub10._id]: 'world',
      };
      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          surveyId: publicSurveyStatusBar._id.toString(),
          fingerprintId: 'validId4',
          answer: answers
        })
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq(content.apiMessages.survey.isCompleted);
    });

    it('should return message survey is expired', async () => {
      const survey = await surveyFactory({
        publicAccess: true,
        startDate: moment().subtract(10, 'days'),
        endDate: moment()
      });
      const surveySection = await surveySectionFactory({ survey });
      const item = await surveyItemFactory({ survey, surveySection });
      await surveyResultFactory({ survey, fingerprintId: 'validId4' });
      const answer = {
        [item._id]: 'hello',
      };
      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          surveyId: survey._id.toString(),
          fingerprintId: 'validId4',
          answer
        })
        .expect(httpStatus.OK);
      expect(res.body.message).to.be.eq(content.apiMessages.survey.expired);
    });

    it('should return message survey is not started', async () => {
      const survey = await surveyFactory({
        publicAccess: true,
        startDate: moment().subtract(-10, 'days'),
        endDate: moment().subtract(-20, 'days')
      });
      const surveySection = await surveySectionFactory({ survey });
      const item = await surveyItemFactory({ survey, surveySection });
      await surveyResultFactory({ survey, fingerprintId: 'validId5' });
      const answer = {
        [item._id]: 'hello',
      };
      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          surveyId: survey._id.toString(),
          fingerprintId: 'validId5',
          answer
        })
        .expect(httpStatus.OK);
      expect(res.body.message).to.be.eq(content.apiMessages.survey.notStarted);
    });
  });

  describe('Check endPage flow logic', () => {
    let surveySection;
    let surveyItem;
    let question;
    let endPage;
    let defaultEndPage;

    before(async () => {
      survey = await surveyFactory({ surveyType: 'survey' });
      surveySection = await surveySectionFactory({ survey });

      [
        question,
        surveyItem,
        endPage,
        defaultEndPage
      ] = await Promise.all([
        questionFactory({}),
        surveyItemFactory({ survey, surveySection, question }),
        contentItemFactory({ survey, type: 'endPage' }),
        contentItemFactory({ survey, type: 'endPage', default: true })
      ]);
    });

    it('should return default end page for survey', async () => {
      const fingerprintId = uuid();

      await surveyResultFactory({ fingerprintId, survey });

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer: { [surveyItem._id]: 'hello' },
          fingerprintId,
          surveyId: survey._id.toString()
        })
        .expect(httpStatus.OK);

      expect(res.body.survey.newEndPage._id.toString()).to.be.eq(defaultEndPage._id.toString());
    });

    it('should return default end page for quiz without end page flow logic', async () => {
      const fingerprintId = uuid();

      await Promise.all([
        Survey.model.updateOne({ _id: survey._id }, { $set: { surveyType: 'quiz' } }),
        surveyResultFactory({ fingerprintId, survey })
      ]);

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer: { [surveyItem._id]: 'hello' },
          fingerprintId,
          surveyId: survey._id.toString()
        })
        .expect(httpStatus.OK);

      expect(res.body.survey.newEndPage._id.toString()).to.be.eq(defaultEndPage._id.toString());
    });

    it('should return end page by condition', async () => {
      const fingerprintId = uuid();

      await Promise.all([
        Survey.model.updateOne({ _id: survey._id }, { $set: { surveyType: 'quiz' } }),
        surveyResultFactory({ fingerprintId, survey, quizCorrect: 5 }),
        flowItemFactory({ survey, questionType: 'endPage', condition: 'equal', count: 5, endPage })
      ]);

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer: { [surveyItem._id]: 'hello' },
          fingerprintId,
          surveyId: survey._id.toString()
        })
        .expect(httpStatus.OK);

      expect(res.body.survey.newEndPage._id.toString()).to.be.eq(endPage._id.toString());
    });

    it('should return end page by range condition', async () => {
      const fingerprintId = uuid();

      await Promise.all([
        Survey.model.updateOne({ _id: survey._id }, { $set: { surveyType: 'quiz' } }),
        surveyResultFactory({ fingerprintId, survey, quizCorrect: 3 }),
        flowItemFactory({ survey, questionType: 'endPage', condition: 'range', count: 5, endPage, range: { from: 1, to: 5 } })
      ]);

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer: { [surveyItem._id]: 'hello' },
          fingerprintId,
          surveyId: survey._id.toString()
        })
        .expect(httpStatus.OK);

      expect(res.body.survey.newEndPage._id.toString()).to.be.eq(endPage._id.toString());
    });
  });

  describe('QuizCorrect count', () => {
    let team;
    let company;
    before(async() => {
      company = await companyFactory({});
      team = await teamFactory({ company });
    });

    it('should count amount of correct answers for different checkbox questions', async () => {
      const fingerprintId = uuid();
      const survey = await surveyFactory({ team, company, surveyType: 'survey', showResultText: 'showResult' });
      const surveySection = await surveySectionFactory({ team, company, survey });
      const question1 = await questionFactory({ team, company, type: 'checkboxes', quiz: true });
      const question2 = await questionFactory({ team, company, type: 'checkboxes', quiz: true });
      const question3 = await questionFactory({ team, company, type: 'checkboxes', quiz: true });
      const question4 = await questionFactory({ team, company, type: 'checkboxes', quiz: true });

      //  question 1, checked both variants but first is a wrong one, shouldnt count as a correct
      const [
        questionItem1,
        questionItem2,
        surveyItem1
      ] = await Promise.all([
        questionItemFactory({ team, company, question: question1 }),
        questionItemFactory({ team, company, question: question1, quizCorrect: true }),
        surveyItemFactory({ team, company, survey, question: question1._id, surveySection }),
      ]);

      //  question 2, should count as correctQuiz 'cause both variants are correct
      await questionItemFactory({ team, company, question: question2 });
      const [
        questionItem3,
        questionItem4,
        surveyItem2
      ] = await Promise.all([
        questionItemFactory({ team, company, question: question2, quizCorrect: true }),
        questionItemFactory({ team, company, question: question2, quizCorrect: true }),
        surveyItemFactory({ team, company, survey, question: question2._id, surveySection }),
      ]);

      //  question 3, shouldnt count as correctQuiz 'cause checked a wrong variant
      await questionItemFactory({ team, company, question: question3, quizCorrect: true });
      const [
        questionItem5,
        surveyItem3
      ] = await Promise.all([
        questionItemFactory({ team, company, question: question3 }),
        surveyItemFactory({ team, company, survey, question: question3._id, surveySection }),
      ]);

      //  question 4, should count as correctQuiz 'cause checked a correct variant
      const [
        questionItem6,
        surveyItem4
      ] = await Promise.all([
        questionItemFactory({ team, company, question: question4, quizCorrect: true }),
        surveyItemFactory({ team, company, survey, question: question4._id, surveySection }),
      ]);

      await Promise.all([
        Survey.model.updateOne({ _id: survey._id }, { $set: { surveyType: 'quiz' } }),
        surveyResultFactory({ team, company, fingerprintId, survey })
      ]);

      await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer: {
            [surveyItem1._id]: [questionItem1._id, questionItem2._id],
            [surveyItem2._id]: [questionItem3._id, questionItem4._id],
            [surveyItem3._id]: [questionItem5._id],
            [surveyItem4._id]: [questionItem6._id],
          },
          fingerprintId,
          surveyId: survey._id.toString()
        })
        .expect(httpStatus.OK);

      const surveyResult = await SurveyResult.model
        .findOne({ fingerprintId })
        .lean();

      expect(surveyResult.quizCorrect).to.be.eq(2);
      expect(surveyResult.completed).to.be.eq(true);
      expect(surveyResult.answer[surveyItem1._id.toString()].questionItems.length).to.be.eq(2);
      expect(surveyResult.answer[surveyItem2._id.toString()].questionItems.length).to.be.eq(2);
      expect(surveyResult.answer[surveyItem3._id.toString()].questionItems.length).to.be.eq(1);
      expect(surveyResult.answer[surveyItem4._id.toString()].questionItems.length).to.be.eq(1);
    });

    it('should count amount of correct answers for different dropdown questions', async () => {
      const fingerprintId = uuid();
      const survey = await surveyFactory({ team, company, surveyType: 'survey', showResultText: 'showResult' });
      const surveySection = await surveySectionFactory({ team, company, survey });
      const question1 = await questionFactory({ team, company, type: 'dropdown', quiz: true });
      const question2 = await questionFactory({ team, company, type: 'dropdown', quiz: true });
      const question3 = await questionFactory({ team, company, type: 'dropdown', quiz: true });

      //  question 1, should count as a correct answer if checked between two correct variants
      const [
        surveyItem1,
        questionItem1
      ] = await Promise.all([
        surveyItemFactory({ team, company, survey, question: question1._id, surveySection }),
        questionItemFactory({ team, company, question: question1, quizCorrect: true }),
        questionItemFactory({ team, company, question: question1, quizCorrect: true }),
      ]);

      //  question 2, should count as a correct answer if checked correct one
      const [
        surveyItem2,
        questionItem2,
      ] = await Promise.all([
        surveyItemFactory({ team, company, survey, question: question2._id, surveySection }),
        questionItemFactory({ team, company, question: question2, quizCorrect: true }),
        questionItemFactory({ team, company, question: question2, quizCorrect: false }),
      ]);

      //  question 3, shouldnt count as a correct answer if checked wrong variant
      const [
        surveyItem3,
        questionItem3,
      ] = await Promise.all([
        surveyItemFactory({ team, company, survey, question: question3._id, surveySection }),
        questionItemFactory({ team, company, question: question3, quizCorrect: false }),
        questionItemFactory({ team, company, question: question3, quizCorrect: true }),
      ]);

      await Promise.all([
        Survey.model.updateOne({ _id: survey._id }, { $set: { surveyType: 'quiz' } }),
        surveyResultFactory({ team, company, fingerprintId, survey })
      ]);

      await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer: {
            [surveyItem1._id]: questionItem1._id,
            [surveyItem2._id]: questionItem2._id,
            [surveyItem3._id]: questionItem3._id
          },
          fingerprintId,
          surveyId: survey._id.toString()
        })
        .expect(httpStatus.OK);

      const surveyResult = await SurveyResult.model
        .findOne({ fingerprintId })
        .lean();

      expect(surveyResult.quizCorrect).to.be.eq(2);
      expect(surveyResult.completed).to.be.eq(true);
      expect(surveyResult.answer[surveyItem1._id.toString()].questionItems.length).to.be.eq(1);
      expect(surveyResult.answer[surveyItem2._id.toString()].questionItems.length).to.be.eq(1);
      expect(surveyResult.answer[surveyItem3._id.toString()].questionItems.length).to.be.eq(1);
    });

    it('should count amount of correct answers for different multipleChoice questions', async () => {
      const fingerprintId = uuid();
      const survey = await surveyFactory({ team, company, surveyType: 'survey', showResultText: 'showResult' });
      const surveySection = await surveySectionFactory({ team, company, survey });
      const question1 = await questionFactory({ team, company, type: 'multipleChoice', quiz: true });
      const question2 = await questionFactory({ team, company, type: 'multipleChoice', quiz: true });
      const question3 = await questionFactory({ team, company, type: 'multipleChoice', quiz: true });

      //  question 1, should count as a correct answer if checked between two correct variants
      const [
        surveyItem1,
        questionItem1
      ] = await Promise.all([
        surveyItemFactory({ team, company, survey, question: question1._id, surveySection }),
        questionItemFactory({ team, company, question: question1, quizCorrect: true }),
        questionItemFactory({ team, company, question: question1, quizCorrect: true }),
      ]);

      //  question 2, should count as a correct answer if checked correct one
      const [
        surveyItem2,
        questionItem2,
      ] = await Promise.all([
        surveyItemFactory({ team, company, survey, question: question2._id, surveySection }),
        questionItemFactory({ team, company, question: question2, quizCorrect: true }),
        questionItemFactory({ team, company, question: question2, quizCorrect: false }),
      ]);

      //  question 3, shouldnt count as a correct answer if checked wrong variant
      const [
        surveyItem3,
        questionItem3,
      ] = await Promise.all([
        surveyItemFactory({ team, company, survey, question: question3._id, surveySection }),
        questionItemFactory({ team, company, question: question3, quizCorrect: false }),
        questionItemFactory({ team, company, question: question3, quizCorrect: true }),
      ]);

      await Promise.all([
        Survey.model.updateOne({ _id: survey._id }, { $set: { surveyType: 'quiz' } }),
        surveyResultFactory({ team, company, fingerprintId, survey })
      ]);

      await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer: {
            [surveyItem1._id]: questionItem1._id,
            [surveyItem2._id]: questionItem2._id,
            [surveyItem3._id]: questionItem3._id
          },
          fingerprintId,
          surveyId: survey._id.toString()
        })
        .expect(httpStatus.OK);

      const surveyResult = await SurveyResult.model
        .findOne({ fingerprintId })
        .lean();

      expect(surveyResult.quizCorrect).to.be.eq(2);
      expect(surveyResult.completed).to.be.eq(true);
      expect(surveyResult.answer[surveyItem1._id.toString()].questionItems.length).to.be.eq(1);
      expect(surveyResult.answer[surveyItem2._id.toString()].questionItems.length).to.be.eq(1);
      expect(surveyResult.answer[surveyItem3._id.toString()].questionItems.length).to.be.eq(1);
    });

    it('should return amount of correct answers for multipleChoice, checkbox, dropDown questions', async () => {
      const fingerprintId = uuid();
      const survey = await surveyFactory({ team, company, surveyType: 'survey', showResultText: 'showResult' });
      const surveySection = await surveySectionFactory({ team, company, survey });
      const question1 = await questionFactory({ team, company, type: 'multipleChoice', quiz: true });
      const question2 = await questionFactory({ team, company, type: 'dropdown', quiz: true });
      const question3 = await questionFactory({ team, company, type: 'checkboxes', quiz: true });

      //  question 1, should count as a correct answer if checked between two correct variants
      const [
        surveyItem1,
        questionItem1
      ] = await Promise.all([
        surveyItemFactory({ team, company, survey, question: question1._id, surveySection }),
        questionItemFactory({ team, company, question: question1, quizCorrect: true }),
        questionItemFactory({ team, company, question: question1, quizCorrect: true }),
      ]);

      //  question 2, should count as a correct answer if checked correct one
      const [
        surveyItem2,
        questionItem2,
      ] = await Promise.all([
        surveyItemFactory({ team, company, survey, question: question2._id, surveySection }),
        questionItemFactory({ team, company, question: question2, quizCorrect: true }),
        questionItemFactory({ team, company, question: question2, quizCorrect: false }),
      ]);

      //  question 3, checked both variants but first is a wrong one, shouldnt count as a correct
      const [
        questionItem3,
        questionItem4,
        surveyItem3
      ] = await Promise.all([
        questionItemFactory({ team, company, question: question3 }),
        questionItemFactory({ team, company, question: question3, quizCorrect: true }),
        surveyItemFactory({ team, company, survey, question: question3._id, surveySection }),
      ]);

      await Promise.all([
        Survey.model.updateOne({ _id: survey._id }, { $set: { surveyType: 'quiz' } }),
        surveyResultFactory({ team, company, fingerprintId, survey })
      ]);

      await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer: {
            [surveyItem1._id]: questionItem1._id,
            [surveyItem2._id]: questionItem2._id,
            [surveyItem3._id]: [questionItem3._id, questionItem4._id],
          },
          fingerprintId,
          surveyId: survey._id.toString()
        })
        .expect(httpStatus.OK);

      const surveyResult = await SurveyResult.model
        .findOne({ fingerprintId })
        .lean();

      expect(surveyResult.quizCorrect).to.be.eq(2);
      expect(surveyResult.completed).to.be.eq(true);
      expect(surveyResult.answer[surveyItem1._id.toString()].questionItems.length).to.be.eq(1);
      expect(surveyResult.answer[surveyItem2._id.toString()].questionItems.length).to.be.eq(1);
      expect(surveyResult.answer[surveyItem3._id.toString()].questionItems.length).to.be.eq(2);
    });

    it('should count amount of correct answers for multipleChoice, checkbox, dropDown questions and save text answer', async () => {
      const fingerprintId = uuid();
      const survey = await surveyFactory({ team, company, surveyType: 'survey', showResultText: 'showResult' });
      const surveySection = await surveySectionFactory({ team, company, survey });
      const question1 = await questionFactory({ team, company, type: 'multipleChoice', quiz: true });
      const question2 = await questionFactory({ team, company, type: 'dropdown', quiz: true });
      const question3 = await questionFactory({ team, company, type: 'checkboxes', quiz: true });

      //  question 1, shouldnt count as a correct answer if checked wrong variant
      const [
        surveyItem1,
        questionItem1
      ] = await Promise.all([
        surveyItemFactory({ team, company, survey, question: question1._id, surveySection }),
        questionItemFactory({ team, company, question: question1, quizCorrect: false }),
        questionItemFactory({ team, company, question: question1, quizCorrect: true }),
      ]);

      //  question 2, should count as a correct answer if checked correct one
      const [
        surveyItem2,
        questionItem2,
      ] = await Promise.all([
        surveyItemFactory({ team, company, survey, question: question2._id, surveySection }),
        questionItemFactory({ team, company, question: question2, quizCorrect: true }),
        questionItemFactory({ team, company, question: question2, quizCorrect: false }),
      ]);

      //  question 3, checked both correct variants
      const [
        questionItem3,
        questionItem4,
        surveyItem3
      ] = await Promise.all([
        questionItemFactory({ team, company, question: question3, quizCorrect: true }),
        questionItemFactory({ team, company, question: question3, quizCorrect: true }),
        surveyItemFactory({ team, company, survey, question: question3._id, surveySection }),
      ]);

      //  question 4, should be saved
      const surveyItem4 = await surveyItemFactory({ team, company, survey, surveySection });

      await Promise.all([
        Survey.model.updateOne({ _id: survey._id }, { $set: { surveyType: 'quiz' } }),
        surveyResultFactory({ team, company, fingerprintId, survey })
      ]);

      const randomAsnwer = faker.lorem.sentence().toLowerCase();
      await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer: {
            [surveyItem1._id]: questionItem1._id,
            [surveyItem2._id]: questionItem2._id,
            [surveyItem3._id]: [questionItem3._id, questionItem4._id],
            [surveyItem4._id]: randomAsnwer,

          },
          fingerprintId,
          surveyId: survey._id.toString()
        })
        .expect(httpStatus.OK);

      const surveyResult = await SurveyResult.model
        .findOne({ fingerprintId })
        .lean();

      expect(surveyResult.quizCorrect).to.be.eq(2);
      expect(surveyResult.completed).to.be.eq(true);
      expect(surveyResult.answer[surveyItem1._id.toString()].questionItems.length).to.be.eq(1);
      expect(surveyResult.answer[surveyItem2._id.toString()].questionItems.length).to.be.eq(1);
      expect(surveyResult.answer[surveyItem3._id.toString()].questionItems.length).to.be.eq(2);
      expect(surveyResult.answer[surveyItem4._id.toString()].value).to.be.eq(randomAsnwer);
    });

    it('should complete a quiz without returning quizResult but response successfully completed message', async () => {
      const fingerprintId = uuid();
      const survey = await surveyFactory({ team, company, surveyType: 'survey' });
      const surveySection = await surveySectionFactory({ team, company, survey });
      const question1 = await questionFactory({ team, company, type: 'dropdown', quiz: true });
      const question2 = await questionFactory({ team, company, type: 'dropdown', quiz: true });
      const question3 = await questionFactory({ team, company, type: 'dropdown', quiz: true });

      //  question 1, should count as a correct answer if checked between two correct variants
      const [
        surveyItem1,
        questionItem1
      ] = await Promise.all([
        surveyItemFactory({ team, company, survey, question: question1._id, surveySection }),
        questionItemFactory({ team, company, question: question1, quizCorrect: true }),
        questionItemFactory({ team, company, question: question1, quizCorrect: true }),
      ]);

      //  question 2, should count as a correct answer if checked correct one
      const [
        surveyItem2,
        questionItem2,
      ] = await Promise.all([
        surveyItemFactory({ team, company, survey, question: question2._id, surveySection }),
        questionItemFactory({ team, company, question: question2, quizCorrect: true }),
        questionItemFactory({ team, company, question: question2, quizCorrect: false }),
      ]);

      //  question 3, shouldnt count as a correct answer if checked wrong variant
      const [
        surveyItem3,
        questionItem3,
      ] = await Promise.all([
        surveyItemFactory({ team, company, survey, question: question3._id, surveySection }),
        questionItemFactory({ team, company, question: question3, quizCorrect: false }),
        questionItemFactory({ team, company, question: question3, quizCorrect: true }),
      ]);

      await Promise.all([
        Survey.model.updateOne({ _id: survey._id }, { $set: { surveyType: 'quiz' } }),
        surveyResultFactory({ team, company, fingerprintId, survey })
      ]);

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer: {
            [surveyItem1._id]: questionItem1._id,
            [surveyItem2._id]: questionItem2._id,
            [surveyItem3._id]: questionItem3._id
          },
          fingerprintId,
          surveyId: survey._id.toString()
        })
        .expect(httpStatus.OK);

      const surveyResult = await SurveyResult.model
        .findOne({ fingerprintId })
        .lean();

      expect(res.body.quizResult).to.be.eq(undefined);
      expect(res.body.message).to.be.eq(content.apiMessages.quiz.isCompleted);
      expect(res.body.allowReAnswer).to.be.eq(false);
      expect(surveyResult.quizCorrect).to.be.eq(2);
      expect(surveyResult.completed).to.be.eq(true);
      expect(surveyResult.answer[surveyItem1._id.toString()].questionItems.length).to.be.eq(1);
      expect(surveyResult.answer[surveyItem2._id.toString()].questionItems.length).to.be.eq(1);
      expect(surveyResult.answer[surveyItem3._id.toString()].questionItems.length).to.be.eq(1);
    });

    it('should return quiz correct and wrong results for each option', async () => {
      const fingerprintId = uuid();
      const survey = await surveyFactory({ team, company, surveyType: 'survey', showResultText: 'showResult' });
      const surveySection = await surveySectionFactory({ team, company, survey });
      const question1 = await questionFactory({ team, company, type: 'multipleChoice', quiz: true });
      const question2 = await questionFactory({ team, company, type: 'dropdown', quiz: true });
      const question3 = await questionFactory({ team, company, type: 'checkboxes', quiz: true });

      //  question 1, shouldnt count as a correct answer if checked wrong variant
      const [
        surveyItem1,
        questionItem1
      ] = await Promise.all([
        surveyItemFactory({ team, company, survey, question: question1._id, surveySection }),
        questionItemFactory({
          team,
          company,
          question: question1,
          sortableId: 0,
          quizCorrect: false
        }),
        questionItemFactory({
          team,
          company,
          question: question1,
          sortableId: 1,
          quizCorrect: true
        }),
      ]);

      //  question 2, should count as a correct answer if checked correct one
      const [
        surveyItem2,
        questionItem2,
      ] = await Promise.all([
        surveyItemFactory({ team, company, survey, question: question2._id, surveySection }),
        questionItemFactory({
          team,
          company,
          question: question2,
          sortableId: 0,
          quizCorrect: true
        }),
        questionItemFactory({
          team,
          company,
          question: question2,
          sortableId: 1,
          quizCorrect: false
        }),
      ]);

      //  question 3, checked both correct variants
      const [
        questionItem3,
        questionItem4,
        surveyItem3
      ] = await Promise.all([
        questionItemFactory({
          team,
          company,
          question: question3,
          sortableId: 0,
          quizCorrect: true
        }),
        questionItemFactory({
          team,
          company,
          question: question3,
          sortableId: 1,
          quizCorrect: true
        }),
        surveyItemFactory({ team, company, survey, question: question3._id, surveySection }),
      ]);

      //  question 4, should be saved
      const surveyItem4 = await surveyItemFactory({ team, company, survey, surveySection });

      await Promise.all([
        Survey.model.updateOne({ _id: survey._id }, { $set: { surveyType: 'quiz' } }),
        surveyResultFactory({ team, company, fingerprintId, survey })
      ]);

      const randomAsnwer = faker.lorem.sentence().toLowerCase();
      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer: {
            [surveyItem1._id]: questionItem1._id,
            [surveyItem2._id]: questionItem2._id,
            [surveyItem3._id]: [questionItem3._id, questionItem4._id],
            [surveyItem4._id]: randomAsnwer,

          },
          fingerprintId,
          surveyId: survey._id.toString()
        })
        .expect(httpStatus.OK);

      expect(res.body.quizResult[0].question.questionItems[0].quizCorrect).to.be.eq(false);
      expect(res.body.quizResult[0].question.questionItems[1].quizCorrect).to.be.eq(true);

      expect(res.body.quizResult[1].question.questionItems[0].quizCorrect).to.be.eq(true);
      expect(res.body.quizResult[1].question.questionItems[1].quizCorrect).to.be.eq(false);

      expect(res.body.quizResult[2].question.questionItems[0].quizCorrect).to.be.eq(true);
      expect(res.body.quizResult[2].question.questionItems[1].quizCorrect).to.be.eq(true);
    });

    it('should return quiz result text for each option', async () => {
      const fingerprintId = uuid();
      const survey = await surveyFactory({ team, company, surveyType: 'survey', showResultText: 'option' });
      const surveySection = await surveySectionFactory({ team, company, survey });
      const question1 = await questionFactory({ team, company, type: 'multipleChoice', quiz: true });
      const correctText1 = { en: faker.lorem.sentence().toLowerCase() };
      const correctText2 = { en: faker.lorem.sentence().toLowerCase() };

      const [
        surveyItem1,
        questionItem1
      ] = await Promise.all([
        surveyItemFactory({ team, company, survey, question: question1._id, surveySection }),
        questionItemFactory({
          team,
          company,
          question: question1,
          sortableId: 0,
          quizCorrect: false,
          quizResultText: correctText1
        }),
        questionItemFactory({
          team,
          company,
          question: question1,
          sortableId: 1,
          quizCorrect: true,
          quizResultText: correctText2
        }),
      ]);

      await Promise.all([
        Survey.model.updateOne({ _id: survey._id }, { $set: { surveyType: 'quiz' } }),
        surveyResultFactory({ team, company, fingerprintId, survey })
      ]);

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer: {
            [surveyItem1._id]: questionItem1._id,
          },
          fingerprintId,
          surveyId: survey._id.toString()
        })
        .expect(httpStatus.OK);

      const questionItems = res.body.quizResult[0].question.questionItems;
      expect(questionItems[0].quizResultText.en).to.be.eq(correctText1.en);
      expect(questionItems[1].quizResultText.en).to.be.eq(correctText2.en);
    });

    it('should complete quiz after the first answered question with flowLogic', async () => {
      const fingerprintId = uuid();
      const survey = await surveyFactory({ team, company, surveyType: 'survey' });
      const surveySection = await surveySectionFactory({ team, company, survey, sortableId: 0 });
      const surveySection2 = await surveySectionFactory({ team, company, survey, sortableId: 1 });
      const question1 = await questionFactory({
        team,
        company,
        type: 'multipleChoice',
        quiz: true
      });
      const question2 = await questionFactory({
        team,
        company,
        type: 'multipleChoice',
        quiz: true
      });

      const [
        surveyItem1,
        questionItem1
      ] = await Promise.all([
        surveyItemFactory({
          team,
          company,
          survey,
          question: question1._id,
          surveySection,
          sortableId: 0
        }),
        questionItemFactory({
          team,
          company,
          question: question1,
          sortableId: 0,
          quizCorrect: false
        }),
        questionItemFactory({
          team,
          company,
          question: question1,
          sortableId: 1,
          quizCorrect: true
        }),
      ]);

      await Promise.all([
        surveyItemFactory({
          team,
          company,
          survey,
          required: true,
          sortableId: 0,
          question: question2,
          surveySection: surveySection2 }),
        questionItemFactory({
          team,
          company,
          question: question2,
          sortableId: 0,
          quizCorrect: false
        }),
        questionItemFactory({
          team,
          company,
          question: question2,
          sortableId: 1,
          quizCorrect: true
        }),
      ]);

      // create flowLogic
      const [
        flowLogic1
      ] = await Promise.all([
        flowLogicFactory({ team, company, surveyItem: surveyItem1, action: 'endSurvey', draftRemove: false })
      ]);

      // create flowItems
      await Promise.all([
        flowItemFactory({
          survey,
          team,
          company,
          flowLogic: flowLogic1,
          draftRemove: false,
          inDraft: false,
          questionType: 'multipleChoice',
          questionItems: [questionItem1._id],
          condition: 'selected'
        }),
      ]);

      await Promise.all([
        Survey.model.updateOne({ _id: survey._id }, { $set: { surveyType: 'quiz' } }),
        surveyResultFactory({ team, company, fingerprintId, survey })
      ]);

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer: {
            [surveyItem1._id]: questionItem1._id,
          },
          fingerprintId,
          surveyId: survey._id.toString()
        })
        .expect(httpStatus.OK);

      const surveyResult = await SurveyResult.model
        .findOne({ fingerprintId })
        .lean();

      const questionItems = surveyResult.answer[surveyItem1._id.toString()].questionItems[0];

      expect(res.body.message).to.be.eq(content.apiMessages.quiz.isCompleted);
      expect(questionItems).to.be.eq(questionItem1._id.toString());
    });

    it('should count thumb quiz question', async () => {
      const fingerprintId = uuid();

      const survey = await surveyFactory({ company, team, surveyType: 'quiz' });

      const surveySection = await surveySectionFactory({ company, team, survey });

      const question = await questionFactory({
        company,
        team,
        survey,
        quiz: true,
        type: 'thumbs',
        quizCorrectValue: 'yes'
      });

      const surveyItem = await surveyItemFactory({
        company,
        team,
        question,
        survey,
        surveySection
      });

      await surveyResultFactory({ team, company, fingerprintId, survey });

      await request(app)
        .put('/api/v1/survey-answers')
        .send({
          fingerprintId,
          surveyId: survey._id.toString(),
          answer: {
            [surveyItem._id]: 'yes'
          }
        })
        .expect(httpStatus.OK);

      const reloadSurveyResult = await SurveyResult.model
        .findOne({ fingerprintId })
        .lean();

      expect(reloadSurveyResult.quizCorrect).to.be.eq(1);
    });

    it('should count slider quiz question', async () => {
      const fingerprintId = uuid();

      const survey = await surveyFactory({ company, team, surveyType: 'quiz' });

      const surveySection = await surveySectionFactory({ company, team, survey });

      const question = await questionFactory({
        company,
        team,
        survey,
        quiz: true,
        type: 'slider',
        quizCondition: 'equal',
        quizCorrectValue: '10'
      });

      const surveyItem = await surveyItemFactory({
        company,
        team,
        question,
        survey,
        surveySection
      });

      await surveyResultFactory({ team, company, fingerprintId, survey });

      await request(app)
        .put('/api/v1/survey-answers')
        .send({
          fingerprintId,
          surveyId: survey._id.toString(),
          answer: {
            [surveyItem._id]: 10
          }
        })
        .expect(httpStatus.OK);

      const reloadSurveyResult = await SurveyResult.model
        .findOne({ fingerprintId })
        .lean();

      expect(reloadSurveyResult.quizCorrect).to.be.eq(1);
    });

    it('should count slider quiz question by range', async () => {
      const fingerprintId = uuid();

      const survey = await surveyFactory({ company, team, surveyType: 'quiz' });

      const surveySection = await surveySectionFactory({ company, team, survey });

      const question = await questionFactory({
        company,
        team,
        survey,
        quiz: true,
        type: 'slider',
        quizCondition: 'isBetween',
        quizCorrectRange: {
          from: 10,
          to: 15
        }
      });

      const surveyItem = await surveyItemFactory({
        company,
        team,
        question,
        survey,
        surveySection
      });

      await surveyResultFactory({ team, company, fingerprintId, survey });

      await request(app)
        .put('/api/v1/survey-answers')
        .send({
          fingerprintId,
          surveyId: survey._id.toString(),
          answer: {
            [surveyItem._id]: 10
          }
        })
        .expect(httpStatus.OK);

      const reloadSurveyResult = await SurveyResult.model
        .findOne({ fingerprintId })
        .lean();

      expect(reloadSurveyResult.quizCorrect).to.be.eq(1);
    });
  });

  describe('Single question', () => {
    let singleQuestionSurvey;
    let section1;
    let section2;
    let item11;
    let item12;
    let item21;
    let item22;

    before(async () => {
      const company = await companyFactory({});
      const team = await teamFactory({ company });

      // create single question survey
      singleQuestionSurvey = await surveyFactory({
        team,
        displaySingleQuestion: true,
        statusBar: true
      });

      // create survey sections
      [
        section1,
        section2
      ] = await Promise.all([
        surveySectionFactory({
          team,
          survey: singleQuestionSurvey,
          sortableId: 0
        }),
        surveySectionFactory({
          team,
          survey: singleQuestionSurvey,
          sortableId: 2
        }),
        // create hide section
        surveySectionFactory({
          team,
          survey: singleQuestionSurvey,
          sortableId: 1,
          hide: true
        }),
      ]);

      // create questions
      const [
        question1,
        question2,
        question3,
        question4
      ] = await Promise.all([
        questionFactory({ team }),
        questionFactory({ team }),
        questionFactory({ team }),
        questionFactory({ team })
      ]);

      // create survey items
      [
        item11,
        item12,
        item21,
        item22
      ] = await Promise.all([
        surveyItemFactory({
          team,
          survey: singleQuestionSurvey,
          surveySection: section1,
          question: question1,
          sortableId: 0
        }),
        surveyItemFactory({
          team,
          survey: singleQuestionSurvey,
          surveySection: section1,
          question: question2,
          sortableId: 1
        }),
        surveyItemFactory({
          team,
          survey: singleQuestionSurvey,
          surveySection: section2,
          question: question3,
          sortableId: 0
        }),
        surveyItemFactory({
          team,
          survey: singleQuestionSurvey,
          surveySection: section2,
          question: question4,
          sortableId: 1
        })
      ]);

      // create flow logic
      const flowLogic = await flowLogicFactory({
        team,
        surveyItem: item11,
        action: 'toSection',
        section: section2
      });

      await flowItemFactory({
        team,
        flowLogic,
        questionType: 'text',
        condition: 'equal',
        value: 'value'
      });
    });

    it('should return first survey item from first section', async () => {
      const token = uuid();

      // create surveyResult and invite
      await Promise.all([
        surveyResultFactory({ survey: singleQuestionSurvey, token }),
        inviteFactory({ token, survey: singleQuestionSurvey })
      ]);

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token,
          answer: {
            [item11._id]: 'hello'
          }
        })
        .expect(httpStatus.OK);

      expect(res.body.survey.surveySection._id.toString()).to.be.eq(section1._id.toString());
      expect(res.body.survey.surveySection.surveyItems.length).to.be.eq(1);
      expect(res.body.survey.surveySection.surveyItems[0]._id.toString())
        .to.be.eq(item12._id.toString());

      expect(res.body.statusBarData.passedSection).to.be.eq(1);
      expect(res.body.statusBarData.totalSection).to.be.eq(2);
      expect(res.body.statusBarData.passed).to.be.eq(1);
      expect(res.body.statusBarData.total).to.be.eq(4);

      const surveyResult = await SurveyResult.model.findOne({ token }).lean();

      expect(surveyResult.step).to.be.eq(0);
      expect(surveyResult.questionStepHistory.length).to.be.eq(2);
      expect(surveyResult.questionStepHistory[0]).to.be.eq(item11._id.toString());
      expect(surveyResult.questionStepHistory[1]).to.be.eq(item12._id.toString());
    });

    it('should return first survey item from second section', async () => {
      const token = uuid();

      // create surveyResult and invite
      await Promise.all([
        surveyResultFactory({
          token,
          questionStepHistory: [item11._id.toString(), item12._id.toString()],
          survey: singleQuestionSurvey,
        }),
        inviteFactory({ token, survey: singleQuestionSurvey })
      ]);

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token,
          answer: {}
        })
        .expect(httpStatus.OK);

      expect(res.body.survey.surveySection._id.toString()).to.be.eq(section2._id.toString());
      expect(res.body.survey.surveySection.surveyItems.length).to.be.eq(1);
      expect(res.body.survey.surveySection.surveyItems[0]._id.toString())
        .to.be.eq(item21._id.toString());

      expect(res.body.statusBarData.passedSection).to.be.eq(0);
      expect(res.body.statusBarData.totalSection).to.be.eq(2);
      expect(res.body.statusBarData.passed).to.be.eq(2);
      expect(res.body.statusBarData.total).to.be.eq(4);

      const surveyResult = await SurveyResult.model.findOne({ token }).lean();

      expect(surveyResult.step).to.be.eq(1);
      expect(surveyResult.questionStepHistory.length).to.be.eq(3);
      expect(surveyResult.questionStepHistory[0]).to.be.eq(item11._id.toString());
      expect(surveyResult.questionStepHistory[1]).to.be.eq(item12._id.toString());
      expect(surveyResult.questionStepHistory[2]).to.be.eq(item21._id.toString());
    });

    it('should complete survey', async () => {
      const token = uuid();

      // create surveyResult and invite
      await Promise.all([
        surveyResultFactory({
          token,
          step: 1,
          questionStepHistory: [item22._id.toString()],
          survey: singleQuestionSurvey,
        }),
        inviteFactory({ token, survey: singleQuestionSurvey })
      ]);

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token,
          answer: {}
        })
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq(content.apiMessages.survey.isCompleted);
    });

    it('should skip to section and return first survey item', async () => {
      const token = uuid();

      // create surveyResult and invite
      await Promise.all([
        surveyResultFactory({ survey: singleQuestionSurvey, token }),
        inviteFactory({ token, survey: singleQuestionSurvey })
      ]);

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          token,
          answer: {
            [item11._id]: 'value'
          }
        })
        .expect(httpStatus.OK);

      expect(res.body.survey.surveySection._id.toString()).to.be.eq(section2._id.toString());
      expect(res.body.survey.surveySection.surveyItems.length).to.be.eq(1);
      expect(res.body.survey.surveySection.surveyItems[0]._id.toString())
        .to.be.eq(item21._id.toString());

      expect(res.body.statusBarData.passedSection).to.be.eq(0);
      expect(res.body.statusBarData.totalSection).to.be.eq(2);
      expect(res.body.statusBarData.passed).to.be.eq(1);
      expect(res.body.statusBarData.total).to.be.eq(4);

      const surveyResult = await SurveyResult.model.findOne({ token }).lean();

      expect(surveyResult.step).to.be.eq(1);
      expect(surveyResult.questionStepHistory.length).to.be.eq(2);
      expect(surveyResult.questionStepHistory[0]).to.be.eq(item11._id.toString());
    });
  });
});
