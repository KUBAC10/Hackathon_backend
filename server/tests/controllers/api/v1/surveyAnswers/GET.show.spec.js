import uuid from 'uuid';
import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';
import moment from 'moment';

// factories
import {
  contentFactory,
  contactFactory,
  surveyFactory,
  companyFactory,
  surveyItemFactory,
  surveyResultFactory,
  surveySectionFactory,
  inviteFactory,
  assetFactory, teamFactory, questionFactory,
} from '../../../../factories';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

// services
import { APIMessagesExtractor } from '../../../../../services';

chai.config.includeStack = true;

let publicItem1;
let publicItem2;
let publicItem3;

let publicItem4;
let publicItem5;
let publicItem6;
let publicItem7;
let publicItem8;
let publicItem9;

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

let company;
let team;
let survey;
let publicSurvey;
let surveyWithOneSection;
let inactiveSurvey;
let surveyWithStatusBar;
let publicSurveyWithStatusBar;

let token1;
let token2;
let tokenCompletedSurvey;
let inactiveToken;

let contact;
let content;

async function makeTestData() {
  // create company and team
  company = await companyFactory({});
  team = await teamFactory({ company });

  [
    survey,
    publicSurvey,
    surveyWithOneSection,
    inactiveSurvey,
    surveyWithStatusBar,
    publicSurveyWithStatusBar
  ] = await Promise.all([
    surveyFactory({ team, active: true, allowReAnswer: true }),
    surveyFactory({ team, statusBar: true, publicAccess: true, active: true }),
    surveyFactory({ team, statusBar: true, active: true }),
    surveyFactory({ team, active: false }),
    surveyFactory({ team, active: true, statusBar: true }),
    surveyFactory({ team, active: true, statusBar: true, publicAccess: true })
  ]);

  const [
    publicSection1,
    publicSection2,
    publicSection3,
    publicSection,

    section1,
    section2,
    section3,
    section4,
    section5,
    section6,
    section7,

    question
  ] = await Promise.all([
    surveySectionFactory({ team, survey: publicSurveyWithStatusBar, sortableId: 0 }),
    surveySectionFactory({ team, survey: publicSurveyWithStatusBar, sortableId: 1 }),
    surveySectionFactory({ team, survey: publicSurveyWithStatusBar, sortableId: 2 }),
    surveySectionFactory({ team, survey: publicSurvey }),

    surveySectionFactory({ team, survey, sortableId: 0 }),
    surveySectionFactory({ team, survey, sortableId: 1 }),
    surveySectionFactory({ team, survey, sortableId: 2 }),
    surveySectionFactory({ team, survey: surveyWithOneSection }),
    surveySectionFactory({ team, survey: surveyWithStatusBar, sortableId: 0 }),
    surveySectionFactory({ team, survey: surveyWithStatusBar, sortableId: 1 }),
    surveySectionFactory({ team, survey: surveyWithStatusBar, sortableId: 2 }),

    questionFactory({ team })
  ]);

  [
    publicItem4,
    publicItem5,
    publicItem6,
    publicItem7,
    publicItem8,
    publicItem9,

    publicItem1,
    publicItem2,
    publicItem3,

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
  ] = await Promise.all([
    surveyItemFactory({
      team, question, survey: publicSurveyWithStatusBar, surveySection: publicSection1
    }),
    surveyItemFactory({
      team, question, survey: publicSurveyWithStatusBar, surveySection: publicSection1
    }),
    surveyItemFactory({
      team, question, survey: publicSurveyWithStatusBar, surveySection: publicSection2
    }),
    surveyItemFactory({
      team, question, survey: publicSurveyWithStatusBar, surveySection: publicSection2
    }),
    surveyItemFactory({
      team, question, survey: publicSurveyWithStatusBar, surveySection: publicSection3
    }),
    surveyItemFactory({
      team, question, survey: publicSurveyWithStatusBar, surveySection: publicSection3
    }),

    surveyItemFactory({ team, question, survey: publicSurvey, surveySection: publicSection }),
    surveyItemFactory({ team, question, survey: publicSurvey, surveySection: publicSection }),
    surveyItemFactory({ team, question, survey: publicSurvey, surveySection: publicSection }),

    surveyItemFactory({ team, question, survey, surveySection: section2 }),
    surveyItemFactory({ team, question, survey, surveySection: section2 }),
    surveyItemFactory({ team, question, survey, surveySection: section2 }),

    surveyItemFactory({ team, question, survey: surveyWithOneSection, surveySection: section4 }),
    surveyItemFactory({ team, question, survey: surveyWithOneSection, surveySection: section4 }),
    surveyItemFactory({ team, question, survey: surveyWithOneSection, surveySection: section4 }),
    surveyItemFactory({ team, question, survey: surveyWithOneSection, surveySection: section4 }),
    surveyItemFactory({ team, question, survey: surveyWithOneSection, surveySection: section4 }),

    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section5 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section5 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section5 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section5 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section5 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section6 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section6 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section6 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section7 }),
    surveyItemFactory({ team, question, survey: surveyWithStatusBar, surveySection: section7 }),

    surveyItemFactory({ team, question, survey, surveySection: section1 }),
    surveyItemFactory({ team, question, survey, surveySection: section1 }),
    surveyItemFactory({ team, question, survey, surveySection: section1 }),
    surveyItemFactory({ team, question, survey, surveySection: section3 }),
    surveyItemFactory({ team, question, survey, surveySection: section3 })
  ]);

  // create contact
  contact = await contactFactory({ company });

  token1 = uuid();
  token2 = uuid();
  tokenCompletedSurvey = uuid();
  inactiveToken = uuid();

  await Promise.all([
    surveyResultFactory({
      team,
      survey,
      contact,
      step: 1,
      token: token1
    }),
    surveyResultFactory({
      team,
      survey: surveyWithOneSection,
      contact,
      token: token2
    }),
    surveyResultFactory({
      team,
      contact,
      completed: true,
      survey: surveyWithOneSection,
      token: tokenCompletedSurvey,
    }),
    surveyResultFactory({
      team,
      survey: publicSurvey,
      fingerprintId: 'testID',
    }),
    surveyResultFactory({
      team,
      survey: inactiveSurvey,
      token: inactiveToken,
      contact
    }),
    surveyResultFactory({
      team,
      survey: inactiveSurvey,
      token: inactiveToken,
      fingerprintId: 'inactiveID',
      contact
    })
  ]);

  // create invites
  await Promise.all([
    inviteFactory({ team, token: token1, survey, contact }),
    inviteFactory({ team, token: token2, survey: surveyWithOneSection, contact }),
    inviteFactory({ team, token: tokenCompletedSurvey, survey: surveyWithOneSection, contact }),
    inviteFactory({ team, token: inactiveToken, survey: inactiveSurvey, contact })
  ]);

  content = await contentFactory({});
  await APIMessagesExtractor.loadData();
}

describe('## GET /api/v1/survey-answers', () => {
  before(cleanData);

  before(makeTestData);

  describe('By Token', () => {
    it('should return isExpired true on expired token', async () => {
      const token = uuid();

      await Promise.all([
        surveyResultFactory({ survey, token, preview: true }),
        inviteFactory({ survey, token, ttl: 1 })
      ]);

      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ token })
        .expect(httpStatus.OK);

      expect(res.body.isExpired).to.be.eq(true);
    });

    it('should response not found error for wrong token', async () => {
      await request(app)
        .get('/api/v1/survey-answers')
        .query({ token: 'wrongToken' })
        .expect(httpStatus.NOT_FOUND);
    });

    it('should return valid survey data based on associated survey result step', async () => {
      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ token: token1 })
        .expect(httpStatus.OK);

      // get ids
      const surveyItemIds = res.body.survey.surveySection.surveyItems.map(i => i._id.toString());

      expect(surveyItemIds.length).to.eq(3);
      expect(surveyItemIds).to.include.members([
        item4._id.toString(),
        item5._id.toString(),
        item6._id.toString(),
      ]);
    });

    it('should return all data for survey with one section', async () => {
      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ token: token2 })
        .expect(httpStatus.OK);
      // get ids
      const surveyItemIds = res.body.survey.surveySection.surveyItems.map(i => i._id.toString());
      //  expect status bar data
      expect(res.body.statusBarData.passed).to.be.eq(0);
      expect(res.body.statusBarData.total).to.be.eq(5);

      expect(surveyItemIds.length).to.eq(5);
      expect(surveyItemIds).to.include.members([
        item9._id.toString(),
        item10._id.toString(),
        item11._id.toString(),
        item12._id.toString(),
        item13._id.toString(),
      ]);
    });

    it('should return message without survey data for completed survey result', async () => {
      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ token: tokenCompletedSurvey })
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq(content.apiMessages.survey.isCompleted);
    });

    it('should return message from inactive survey', async () => {
      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ token: inactiveToken })
        .expect(httpStatus.OK);
      expect(res.body.message).to.be.eq(content.apiMessages.survey.notActive);
    });

    it('should return survey data with status bar', async () => {
      const token = uuid();
      await inviteFactory({ survey: surveyWithStatusBar, token, contact });
      await surveyResultFactory({ survey: surveyWithStatusBar, token, contact });
      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ token })
        .expect(httpStatus.OK);

      expect(res.body.statusBarData.passed).to.be.eq(0);
      expect(res.body.statusBarData.total).to.be.eq(10);

      // get ids
      const surveyItemIds = res.body.survey.surveySection.surveyItems.map(i => i._id.toString());
      expect(surveyItemIds).to.include.members([
        item14._id.toString(),
        item15._id.toString(),
        item16._id.toString(),
        item17._id.toString(),
        item18._id.toString(),
      ]);
    });

    it('should return survey data with status bar for next step', async () => {
      const token = uuid();
      await inviteFactory({ survey: surveyWithStatusBar, token, contact });
      await surveyResultFactory({
        survey: surveyWithStatusBar, token, contact, step: 1
      });

      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ token })
        .expect(httpStatus.OK);

      expect(res.body.statusBarData.passed).to.be.eq(5);
      expect(res.body.statusBarData.total).to.be.eq(10);

      // get ids
      const surveyItemIds = res.body.survey.surveySection.surveyItems.map(i => i._id.toString());
      expect(surveyItemIds).to.include.members([
        item19._id.toString(),
        item20._id.toString(),
        item21._id.toString(),
      ]);
    });

    it('should return survey data with status bar for last step', async () => {
      const token = uuid();
      await inviteFactory({ survey: surveyWithStatusBar, token, contact });
      await surveyResultFactory({ survey: surveyWithStatusBar, token, contact, step: 2 });

      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ token })
        .expect(httpStatus.OK);

      expect(res.body.statusBarData.passed).to.be.eq(8);
      expect(res.body.statusBarData.total).to.be.eq(10);

      // get ids
      const surveyItemIds = res.body.survey.surveySection.surveyItems.map(i => i._id.toString());
      expect(surveyItemIds).to.include.members([
        item22._id.toString(),
        item23._id.toString(),
      ]);
    });

    it('should return survey data with assets', async () => {
      const token = uuid();
      const asset = await assetFactory({});
      await inviteFactory({ survey, token, contact });
      await surveyResultFactory({ survey, token, contact, assets: [asset._id] });
      await request(app)
        .get('/api/v1/survey-answers')
        .query({
          token,
          'assets[]': [asset._id.toString()]
        })
        .expect(httpStatus.OK);
    });

    it('should return survey not started', async () => {
      const token = uuid();
      const survey = await surveyFactory({ startDate: moment().subtract(-5, 'days') });
      await inviteFactory(({ survey, token, contact }));
      await surveyResultFactory({ survey, token, contact });
      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ token })
        .expect(httpStatus.OK);
      expect(res.body.message).to.be.eq(content.apiMessages.survey.notStarted);
    });

    it('should return message for expired survey', async () => {
      const token = uuid();
      const survey = await surveyFactory({
        startDate: moment().subtract(10, 'days'),
        endDate: moment()
      });
      await inviteFactory(({ survey, token, contact }));
      await surveyResultFactory({ survey, token, contact });
      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ token })
        .expect(httpStatus.OK);
      expect(res.body.message).to.be.eq(content.apiMessages.survey.expired);
    });

    it('should return message survey not started', async () => {
      const token = uuid();
      const survey = await surveyFactory({
        startDate: moment().subtract(-10, 'days'),
        endDate: moment().subtract(-20, 'days')
      });
      await inviteFactory(({ survey, token, contact }));
      await surveyResultFactory({ survey, token, contact });
      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ token })
        .expect(httpStatus.OK);
      expect(res.body.message).to.be.eq(content.apiMessages.survey.notStarted);
    });

    it('should return message survey is not started, if current date comes earlier than survey start date', async() => {
      // create a survey
      const survey = await surveyFactory({
        company,
        statusBar: true,
        startDate: moment().add(2, 'days')
      });
      // create surveySection
      const surveySection = await surveySectionFactory({ survey });
      // create surveyItems
      await surveyItemFactory({
        survey,
        surveySection,
      });
      const token = uuid();
      await inviteFactory({ survey, token });
      await surveyResultFactory({ survey, token });

      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ token })
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq(content.apiMessages.survey.notStarted);
    });

    it('should return message survey is expired, if current date equal or comes after survey end date', async() => {
      // create a survey
      const survey = await surveyFactory({ company, endDate: moment() });
      // create surveySection
      const surveySection = await surveySectionFactory({ survey });
      // create surveyItems
      await surveyItemFactory({
        survey,
        surveySection,
      });
      const token = uuid();
      await inviteFactory({ survey, token });
      await surveyResultFactory({ survey, token });

      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ token })
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq(content.apiMessages.survey.expired);
    });

    // need to make draftData to survey and check that on answer user
    // still have original survey data
    xit('should return "original" on answer survey before apply draftData');
  });

  describe('By fingerprint Id', () => {
    it('should return error when fingerprintId not presence in request', async () => {
      await request(app)
        .get('/api/v1/survey-answers')
        .query({ surveyId: survey._id.toString() })
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return error when surveyId not presence in request', async () => {
      await request(app)
        .get('/api/v1/survey-answers')
        .query({ fingerprintId: 'testId' })
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return survey data', async () => {
      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ fingerprintId: 'testID', surveyId: publicSurvey._id.toString() })
        .expect(httpStatus.OK);

      // get ids
      const surveyItemIds = res.body.survey.surveySection.surveyItems.map(i => i._id.toString());
      expect(res.body.statusBarData.passed).to.be.eq(0);
      expect(res.body.statusBarData.total).to.be.eq(3);
      expect(surveyItemIds.length).to.eq(3);
      expect(surveyItemIds).to.include.members([
        publicItem1._id.toString(),
        publicItem2._id.toString(),
        publicItem3._id.toString(),
      ]);
    });

    it('should return message from inactive survey', async () => {
      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ fingerprintId: 'inactiveID', surveyId: inactiveSurvey._id.toString() })
        .expect(httpStatus.OK);
      expect(res.body.message).to.be.eq(content.apiMessages.survey.notActive);
    });

    it('should return survey data with status', async () => {
      await inviteFactory({ survey: publicSurveyWithStatusBar, fingerprintId: 'testID2' });
      await surveyResultFactory({ survey: publicSurveyWithStatusBar, fingerprintId: 'testID2' });

      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ fingerprintId: 'testID2', surveyId: publicSurveyWithStatusBar._id.toString() })
        .expect(httpStatus.OK);

      expect(res.body.statusBarData.passed).to.be.eq(0);
      expect(res.body.statusBarData.total).to.be.eq(6);

      // get ids
      const surveyItemIds = res.body.survey.surveySection.surveyItems.map(i => i._id.toString());
      expect(surveyItemIds).to.include.members([
        publicItem4._id.toString(),
        publicItem5._id.toString(),
      ]);
    });

    it('should return survey data with status for next step', async () => {
      await inviteFactory({ survey: publicSurveyWithStatusBar, fingerprintId: 'testID3' });
      await surveyResultFactory({
        survey: publicSurveyWithStatusBar,
        fingerprintId: 'testID3',
        step: 1
      });

      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ fingerprintId: 'testID3', surveyId: publicSurveyWithStatusBar._id.toString() })
        .expect(httpStatus.OK);

      expect(res.body.statusBarData.passed).to.be.eq(2);
      expect(res.body.statusBarData.total).to.be.eq(6);

      // get ids
      const surveyItemIds = res.body.survey.surveySection.surveyItems.map(i => i._id.toString());
      expect(surveyItemIds).to.include.members([
        publicItem6._id.toString(),
        publicItem7._id.toString(),
      ]);
    });

    it('should return survey data with status for last step', async () => {
      await inviteFactory({ survey: publicSurveyWithStatusBar, fingerprintId: 'testID4' });
      await surveyResultFactory({
        survey: publicSurveyWithStatusBar,
        fingerprintId: 'testID4',
        step: 2
      });

      const res = await request(app)
        .get('/api/v1/survey-answers')
        .query({ fingerprintId: 'testID4', surveyId: publicSurveyWithStatusBar._id.toString() })
        .expect(httpStatus.OK);

      expect(res.body.statusBarData.passed).to.be.eq(4);
      expect(res.body.statusBarData.total).to.be.eq(6);

      // get ids
      const surveyItemIds = res.body.survey.surveySection.surveyItems.map(i => i._id.toString());
      expect(surveyItemIds).to.include.members([
        publicItem8._id.toString(),
        publicItem9._id.toString(),
      ]);
    });

    it('should return survey data with assets', async () => {
      const asset = await assetFactory({});
      await inviteFactory({ survey, fingerprintId: 'testID5' });
      await surveyResultFactory({ survey, fingerprintId: 'testID5', assets: [asset._id] });
      await request(app)
        .get('/api/v1/survey-answers')
        .query({
          fingerprintId: 'testID5',
          surveyId: survey._id.toString(),
          'assets[]': [asset._id.toString()]
        })
        .expect(httpStatus.OK);
    });
  });
});
