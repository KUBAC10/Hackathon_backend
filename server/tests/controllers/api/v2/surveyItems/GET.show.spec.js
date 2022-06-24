import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  clientFactory,
  companyFactory,
  questionFactory,
  surveyItemFactory,
} from 'server/tests/factories';

chai.config.includeStack = true;

let token;
let question1;
let question2;
let surveyItem1;
let surveyItem2;
let company1;
let company2;

const clientId = 'abcd123';
const clientSecret = 'foobar';

async function makeTestData() {
  [company1, company2] = await Promise.all([
    companyFactory({})
  ]);

  await clientFactory({ clientId, clientSecret, company: company1 });

  // create entities in different company scopes
  [question1, question2] = await Promise.all([
    questionFactory({ company: company1, type: 'linearScale', from: 1, to: 5 }),
    questionFactory({ company: company2, type: 'linearScale', from: 1, to: 5 }),
  ]);

  surveyItem1 = await surveyItemFactory({ question: question1, company: company1 });
  surveyItem2 = await surveyItemFactory({ question: question2, company: company2 });
}

describe('## GET /api/v2/survey-items/:id', () => {
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

    it('should return error when survey item not related with client company', async () => {
      await request(app)
        .get(`/api/v2/survey-items/${surveyItem2._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.NOT_FOUND);
    });

    it('should return survey item by id with all related structure', async () => {
      const res = await request(app)
        .get(`/api/v2/survey-items/${surveyItem1._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.OK);

      expect(res.body._id.toString()).to.be.eq(surveyItem1._id.toString());
      expect(res.body.question._id.toString()).to.be.eq(question1._id.toString());
      expect(res.body.question).to.have.property('_id');
      expect(res.body.question).to.have.property('name');
      expect(res.body.question).to.have.property('linearScale');
    });
  });

  describe('Non authorized', () => {
    it('should return error for non authorized request', async () => {
      await request(app)
        .get(`/api/v2/survey-items/${surveyItem1._id.toString()}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
