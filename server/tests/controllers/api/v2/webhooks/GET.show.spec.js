import request from 'supertest';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';
import v2authRequest from 'server/tests/testHelpers/v2authRequest';

// factories
import {
  clientFactory,
  companyFactory,
  webhookFactory
} from 'server/tests/factories';
import httpStatus from 'http-status';

chai.config.includeStack = true;

let company1;
let company2;
let webhook1;
let webhook2;

const clientId = 'abcd123';
const clientSecret = 'foobar';

async function makeTestData() {
  [company1, company2] = await Promise.all([
    companyFactory({})
  ]);

  await clientFactory({ clientId, clientSecret, company: company1 });

  webhook1 = await webhookFactory({ company: company1 });
  webhook2 = await webhookFactory({ company: company2 });
}

describe('## GET /api/v2/webhooks/:id', () => {
  before(cleanData);

  before(makeTestData);

  describe('Non authorized', () => {
    it('should return error for non authorized request', async () => {
      await request(app)
        .get(`/api/v2/webhooks/${webhook1._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('Authorized', () => {
    let token;

    before(async () => {
      const res = await v2authRequest(clientId, clientSecret);
      token = res.body.access_token;
    });

    it('should return webhook', async () => {
      const res = await request(app)
        .get(`/api/v2/webhooks/${webhook1._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.OK);

      expect(res.body._id.toString()).to.be.eq(webhook1._id.toString());
      expect(res.body).to.have.property('type');
      expect(res.body).to.have.property('secret');
      expect(res.body).to.have.property('url');
    });

    it('should reject to webhook from another company', async () => {
      await request(app)
        .get(`/api/v2/webhooks/${webhook2._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });
});
