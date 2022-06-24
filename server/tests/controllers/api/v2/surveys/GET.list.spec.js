import _ from 'lodash';
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
} from 'server/tests/factories';

chai.config.includeStack = true;

let token;

let survey1;
let survey2;

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

  [survey1, survey2] = await Promise.all(_.flatMap(_.times(2), () => [
    surveyFactory({ company: company1 }),
  ]));

  await Promise.all(_.flatMap(_.times(2), () => [
    surveyFactory({ company: company2 }),
  ]));
}

describe('## GET /api/v2/surveys', () => {
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

    it('should return list of surveys with base data by client company scope', async () => {
      const res = await request(app)
        .get('/api/v2/surveys')
        .set('Authorization', `Bearer ${token}`)
        .query({
          limit: 10
        })
        .expect(httpStatus.OK);

      expect(res.body.resources.length).to.be.eq(2);
      expect(res.body.resources.map(r => r._id))
        .to.include.members([survey1._id.toString(), survey2._id.toString()]);
    });
  });

  describe('Non authorized', () => {
    it('should return error for non authorized request', async () => {
      await request(app)
        .get('/api/v2/surveys')
        .query({
          limit: 10
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
