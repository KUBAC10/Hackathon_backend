import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';
import uuid from 'uuid';

// factories
import {
  surveyResultFactory,
  inviteFactory,
  surveyFactory,
  contactFactory,
  companyFactory,
  surveySectionFactory,
  surveyItemFactory,
  teamFactory,
  contentFactory, questionFactory,
} from '../../../../factories';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

// services
import {
  APIMessagesExtractor
} from '../../../../../services';

chai.config.includeStack = true;

let survey;
let section1;
let section2;
let section3;
let contact;
let content;
let company;
let team;

async function makeTestData() {
  // create company adn team
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create survey and contact and content
  [
    survey,
    contact,
    content
  ] = await Promise.all([
    surveyFactory({ company, team, allowReAnswer: true }),
    contactFactory({ company, team }),
    contentFactory({})
  ]);

  // create survey sections
  [
    section1,
    section2,
    section3
  ] = await Promise.all([
    surveySectionFactory({ survey, sortableId: 0, team, company }),
    surveySectionFactory({ survey, sortableId: 1, team, company }),
    surveySectionFactory({ survey, sortableId: 2, team, company }),
    surveySectionFactory({ survey, sortableId: 3, team, company }),
    surveySectionFactory({ survey, sortableId: 4, team, company }),
  ]);

  await APIMessagesExtractor.loadData();
}

describe('## GET /api/v1/survey-answers/step-back', () => {
  before(cleanData);

  before(makeTestData);

  describe('By token', () => {
    it('should return isExpired true on expired token', async () => {
      const token = uuid();

      await Promise.all([
        surveyResultFactory({ survey, token, preview: true }),
        inviteFactory({ survey, token, ttl: 1 })
      ]);

      const res = await request(app)
        .get('/api/v1/survey-answers/step-back')
        .query({ token })
        .expect(httpStatus.OK);

      expect(res.body.isExpired).to.be.eq(true);
    });

    it('should do step back with related survey result items', async () => {
      // create survey result and invite
      const token = uuid();
      const stepHistory = [0, 1, 2];

      await Promise.all([
        surveyResultFactory({ token, contact, survey, stepHistory }),
        inviteFactory({ token, contact, survey })
      ]);

      // create survey items
      await Promise.all([
        surveyItemFactory({ surveySection: section1 }),
        surveyItemFactory({ surveySection: section1 }),
        surveyItemFactory({ surveySection: section2 }),
        surveyItemFactory({ surveySection: section3 }),
        surveyItemFactory({ surveySection: section3 })
      ]);

      const res = await request(app)
        .get('/api/v1/survey-answers/step-back')
        .query({ token })
        .expect(httpStatus.OK);

      expect(res.body.survey.surveySection.sortableId).to.be.eq(2);
    });

    it('should do step back on another stepHistory', async () => {
      // create survey result and invite
      const token = uuid();
      const stepHistory = [0, 3, 4, 1];

      await Promise.all([
        inviteFactory({ token, contact, survey }),
        surveyResultFactory({ token, contact, survey, stepHistory })
      ]);

      const res = await request(app)
        .get('/api/v1/survey-answers/step-back')
        .query({ token })
        .expect(httpStatus.OK);

      expect(res.body.survey.surveySection.sortableId).to.be.eq(1);
    });

    it('should return error if try do step back on first section', async () => {
      // create survey result and invite
      const token = uuid();

      await Promise.all([
        inviteFactory({ token, contact, survey }),
        surveyResultFactory({ token, contact, survey })
      ]);

      const res = await request(app)
        .get('/api/v1/survey-answers/step-back')
        .query({ token })
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq(content.apiMessages.survey.cantChangeStep);
    });

    it('should return error if try do step back on survey without permission to do that', async () => {
      // create survey result and invite
      const token = uuid();
      const survey = await surveyFactory({ team, company, stepBack: false });

      await Promise.all([
        inviteFactory({ token, contact, survey }),
        surveyResultFactory({ token, contact, survey }),
        surveySectionFactory({ survey })
      ]);

      const res = await request(app)
        .get('/api/v1/survey-answers/step-back')
        .query({ token })
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq(content.apiMessages.survey.cantChangeStep);
    });
  });

  describe('Single question', () => {
    let item11;
    let item12;

    before(async () => {
      // create survey
      survey = await surveyFactory({ displaySingleQuestion: true, allowReAnswer: true });

      // create survey section
      section1 = await surveySectionFactory({ team, survey, step: 0 });

      // create questions
      const [
        question1,
        question2
      ] = await Promise.all([
        questionFactory({ team }),
        questionFactory({ team })
      ]);

      // create survey items
      [
        item11,
        item12
      ] = await Promise.all([
        surveyItemFactory({
          team,
          survey,
          surveySection: section1,
          question: question1,
          sortableId: 0
        }),
        surveyItemFactory({
          team,
          survey,
          surveySection: section1,
          question: question2,
          sortableId: 1
        })
      ]);
    });

    it('should return first survey item', async () => {
      const token = uuid();

      await Promise.all([
        surveyResultFactory({
          token,
          survey,
          step: 0,
          questionStepHistory: [item12._id.toString()]
        }),
        inviteFactory({ token, survey })
      ]);

      const res = await request(app)
        .get('/api/v1/survey-answers/step-back')
        .query({ token })
        .expect(httpStatus.OK);

      expect(res.body.survey.surveySection._id.toString()).to.be.eq(section1._id.toString());
      expect(res.body.survey.surveySection.surveyItems.length).to.be.eq(1);
      expect(res.body.survey.surveySection.surveyItems[0]._id.toString())
        .to.be.eq(item11._id.toString());
    });
  });
});

