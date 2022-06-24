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
  clientFactory,
  companyFactory,
  surveyFactory,
  surveyResultFactory,
} from 'server/tests/factories';

chai.config.includeStack = true;

let token;

let survey;
let company1;
let company2;

let res1;
let res2;
let res3;

const clientId = 'abcd123';
const clientSecret = 'foobar';

async function makeTestData() {
  [company1, company2] = await Promise.all([
    companyFactory({})
  ]);

  await clientFactory({ clientId, clientSecret, company: company1 });
  survey = await surveyFactory({});

  // create entities in different company scopes
  [
    res1,
    res2,
    res3
  ] = await Promise.all([
    surveyResultFactory({ survey, company: company1 }),
    surveyResultFactory({ survey, company: company1 }),
    surveyResultFactory({ survey, company: company2 }),
  ]);
}

describe('## DELETE /api/v2/surveys-results/remove-array', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    before(async () => {
      const res = await request(app)
        .post('/oauth/token')
        .send({ grant_type: 'client_credentials' })
        .auth('abcd123', 'foobar');
      token = res.body.access_token;
    });

    it('should remove results by idsArray', async () => {
      await request(app)
        .delete('/api/v2/survey-results/remove-array')
        .query({
          idsArray: [
            res1._id.toString(),
            res2._id.toString(),
          ]
        })
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.NO_CONTENT);

      // reload survey results
      const results = await SurveyResult.model.find();
      expect(results.length).to.be.eq(1);
    });

    it('should return status not found', async () => {
      await request(app)
        .delete('/api/v2/survey-results/remove-array')
        .query({
          idsArray: [res3._id.toString()]
        })
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('Non authorized', () => {
    it('should return error for non authorized request', async () => {
      await request(app)
        .delete('/api/v2/survey-results/remove-array')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
