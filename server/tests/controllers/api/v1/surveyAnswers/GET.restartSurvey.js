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
  contentFactory,
} from 'server/tests/factories';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// services
import {
  APIMessagesExtractor
} from 'server/services';

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

describe('## GET /api/v1/survey-answers/restart-survey', () => {
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
        .get('/api/v1/survey-answers/restart-survey')
        .query({ token })
        .expect(httpStatus.OK);

      expect(res.body.isExpired).to.be.eq(true);
    });

    it('should restart survey  with related survey result items', async () => {
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
        .get('/api/v1/survey-answers/restart-survey')
        .query({ token })
        .expect(httpStatus.OK);

      expect(res.body.survey.surveySection.sortableId).to.be.eq(0);
    });

    it('should return error if try to restart survey without permission to do that', async () => {
      // create survey result and invite
      const token = uuid();
      const survey = await surveyFactory({ team, company, allowReAnswer: false });

      await Promise.all([
        inviteFactory({ token, contact, survey }),
        surveyResultFactory({ token, contact, survey }),
        surveySectionFactory({ survey })
      ]);

      const res = await request(app)
        .get('/api/v1/survey-answers/restart-survey')
        .query({ token })
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq(content.apiMessages.survey.cantChangeStep);
    });
  });
});

