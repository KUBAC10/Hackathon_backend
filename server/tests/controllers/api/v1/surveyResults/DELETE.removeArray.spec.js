import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import { SurveyResult, Survey } from 'server/models';

// factories
import {
  companyFactory,
  surveyFactory,
  surveyResultFactory,
  userFactory,
} from 'server/tests/factories';

chai.config.includeStack = true;

let company;
let survey;

let res1;
let res2;
let res3;

const email = 'test@email.com';
const password = 'foo123bar';

async function makeTestData() {
  company = await companyFactory({});

  survey = await surveyFactory({ company });

  // create entities in different company scopes
  [
    res1,
    res2
  ] = await Promise.all([
    surveyResultFactory({ survey, company }),
    surveyResultFactory({ survey, company })
  ]);

  res3 = await surveyFactory();

  // create power User
  await userFactory({ email, password, company, isPowerUser: true });
}

describe('## DELETE /api/v1/surveys-results/batch-remove', () => {
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

    it('should remove results by idsArray', async () => {
      await agent
        .delete('/api/v1/survey-results/batch-remove')
        .send({
          idsArray: [
            res1._id.toString(),
            res2._id.toString(),
          ]
        })
        .expect(httpStatus.NO_CONTENT);

      // reload survey results
      const results = await SurveyResult.model.find();
      expect(results.length).to.be.eq(0);

      // should update survey counters
      const surveyReload = await Survey.model.findById(survey).lean();
      expect(surveyReload.totalResults).to.be.eq(0);
    });

    it('should return status no content for unprocessable entities', async () => {
      await agent
        .delete('/api/v1/survey-results/batch-remove')
        .send({
          idsArray: [res3._id]
        })
        .expect(httpStatus.NO_CONTENT);
    });
  });

  describe('Non authorized', () => {
    it('should return error for non authorized request', async () => {
      await request(app)
        .delete('/api/v1/survey-results/batch-remove')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
