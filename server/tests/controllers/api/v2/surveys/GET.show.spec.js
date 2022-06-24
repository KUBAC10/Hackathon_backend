import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  clientFactory,
  surveyFactory,
  companyFactory,
  surveyItemFactory,
  surveySectionFactory,
} from 'server/tests/factories';

chai.config.includeStack = true;

let token;

let survey1;
let survey2;

let company1;
let company2;

let surveySection;

const clientId = 'abcd123';
const clientSecret = 'foobar';

async function makeTestData() {
  [company1, company2] = await Promise.all([
    companyFactory({})
  ]);

  await clientFactory({ clientId, clientSecret, company: company1 });

  // create entities in different company scopes
  [survey1, survey2] = await Promise.all([
    surveyFactory({ company: company1 }),
    surveyFactory({ company: company2 })
  ]);

  surveySection = await surveySectionFactory({ survey: survey1 });
  await surveyItemFactory({ surveySection, survey: survey1 });
}

describe('## GET /api/v2/surveys/:id', () => {
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

    it('should return error when survey not related with client company', async () => {
      await request(app)
        .get(`/api/v2/surveys/${survey2._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.NOT_FOUND);
    });

    // TODO: Check structure
    it('should return survey by id with all related structure', async () => {
      const res = await request(app)
        .get(`/api/v2/surveys/${survey1._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.OK);

      expect(res.body.company._id.toString()).to.be.eq(company1._id.toString());
    });
  });

  describe('Non authorized', () => {
    it('should return error for non authorized request', async () => {
      await request(app)
        .get(`/api/v2/surveys/${survey1._id.toString()}`)
        .query({
          limit: 10
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
