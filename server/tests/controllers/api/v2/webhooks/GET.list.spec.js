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
  webhookFactory,
  companyFactory,
} from 'server/tests/factories';
import v2authRequest from '../../../../testHelpers/v2authRequest';

chai.config.includeStack = true;

let webhook1;
let webhook2;

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
  [webhook1, webhook2] = await Promise.all(_.flatMap(_.times(2), () => [
    webhookFactory({ company: company1 }),
  ]));
  await Promise.all(_.flatMap(_.times(2), () => [
    webhookFactory({ company: company2 }),
  ]));
}

describe('## GET /api/v2/webhooks', () => {
  before(cleanData);

  before(makeTestData);

  describe('Non authorized', () => {
    it('should return error for non authorized request', async () => {
      await request(app)
        .get('/api/v2/webhooks')
        .query({
          limit: 10
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('Authorized', () => {
    let token;

    before(async () => {
      const res = await v2authRequest(clientId, clientSecret);
      token = res.body.access_token;
    });

    it('should return list of webhooks with base data by client company scope', async () => {
      const res = await request(app)
        .get('/api/v2/webhooks')
        .set('Authorization', `Bearer ${token}`)
        .query({
          limit: 10
        })
        .expect(httpStatus.OK);

      expect(res.body.resources.length).to.be.eq(2);
      expect(res.body.resources.map(r => r._id))
        .to.include.members([webhook1._id.toString(), webhook2._id.toString()]);
    });
  });
});
