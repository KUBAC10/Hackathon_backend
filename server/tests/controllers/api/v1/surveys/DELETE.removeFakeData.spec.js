import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import { SurveyResult } from 'server/models';

// factories
import {
  companyFactory,
  contentFactory,
  surveyFactory,
  surveyResultFactory,
  teamFactory,
  userFactory
} from '../../../../factories';

import APIMessagesExtractor from '../../../../../services/APIMessagesExtractor';

chai.config.includeStack = true;

let content;
let survey;
let survey2;
const email = 'test@email.com';
const password = 'qwe123qwe';

async function makeTestData() {
  const company = await companyFactory({});
  const team = await teamFactory({ company });
  content = await contentFactory({});
  [
    survey,
    survey2
  ] = await Promise.all([
    surveyFactory({}),
    surveyFactory({}),
  ]);

  // create fake results
  await Promise.all([
    surveyResultFactory({ survey, fake: true }),
    surveyResultFactory({ survey, fake: true }),
    surveyResultFactory({ survey, fake: true }),
    surveyResultFactory({ survey }),
    surveyResultFactory({ survey }),
  ]);

  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });
  await APIMessagesExtractor.loadData();
}

describe('## DELETE /api/v1/surveys/:id/remove-fake-data', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    const agent = request.agent(app);

    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          login: email,
          password
        });
    });

    it('should delete fake results', async () => {
      await agent
        .delete(`/api/v1/surveys/${survey._id.toString()}/remove-fake-data`)
        .expect(httpStatus.NO_CONTENT);

      // reload survey results
      const results = await SurveyResult.model.find({ survey });

      expect(results.length).to.be.eq(2);
      expect(results.map(r => r.fake)).to.not.includes(true);
    });

    it('should return error when fake result not found', async () => {
      const res = await agent
        .delete(`/api/v1/surveys/${survey2._id.toString()}/remove-fake-data`)
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq(content.apiMessages.survey.noFakeResults);
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .delete(`/api/v1/surveys/${survey._id.toString()}/remove-fake-data`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
