import request from 'supertest';
import httpStatus from 'http-status';
import chai from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

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

const clientId = 'abcd123';
const clientSecret = 'foobar';

async function makeTestData() {
  [company1, company2] = await Promise.all([
    companyFactory({})
  ]);

  await clientFactory({ clientId, clientSecret, company: company1 });
  survey = await surveyFactory({});
  // create entities in different company scopes
  await Promise.all([
    surveyResultFactory({ survey, company: company1, meta: { userId: '123123' } }),
    surveyResultFactory({ survey, company: company1, meta: { email: 'foo@bar1.com' } }),
    surveyResultFactory({ survey, company: company2, meta: { email: 'foo@bar2.com' } }),
  ]);
}

describe('## DELETE /api/v2/surveys/remove-one', () => {
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

    it('should return error when survey result not related with client company', async () => {
      await request(app)
        .delete('/api/v2/survey-results/remove-one')
        .send({
          surveyId: survey._id.toString(),
          meta: {
            userId: 'foo@bar2.com',
          }
        })
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.NOT_FOUND);
    });

    it('should remove survey result by meta userId', async () => {
      await request(app)
        .delete('/api/v2/survey-results/remove-one')
        .send({
          meta: {
            userId: '123123'
          },
          surveyId: survey._id.toString()
        })
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.NO_CONTENT);
    });

    it('should remove survey result by meta email', async () => {
      await request(app)
        .delete('/api/v2/survey-results/remove-one')
        .send({
          meta: {
            email: 'foo@bar1.com'
          },
          surveyId: survey._id.toString()
        })
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.NO_CONTENT);
    });
  });

  describe('Non authorized', () => {
    it('should return error for non authorized request', async () => {
      await request(app)
        .delete('/api/v2/survey-results/remove-one')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
