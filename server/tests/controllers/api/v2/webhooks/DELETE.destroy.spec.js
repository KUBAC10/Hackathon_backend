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
  webhookFactory
} from 'server/tests/factories';

// models
import { Webhook } from 'server/models';

// helpers
import v2authRequest from '../../../../testHelpers/v2authRequest';

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
  // create entities in different company scopes
  [
    webhook1,
    webhook2
  ] = await Promise.all([
    webhookFactory({ company: company1 }),
    webhookFactory({ company: company2 })
  ]);
}

describe('## DELETE /api/v2/webhooks/:id', () => {
  before(cleanData);

  before(makeTestData);

  describe('Non authorized', () => {
    it('should return error for non authorized request', async () => {
      await request(app)
        .delete(`/api/v2/webhooks/${webhook1._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('Authorized', () => {
    let token;

    before(async () => {
      const res = await v2authRequest(clientId, clientSecret);
      token = res.body.access_token;
    });

    it('should return error when webhook not related with client company', async () => {
      await request(app)
        .delete(`/api/v2/webhooks/${webhook2._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.NOT_FOUND);
    });

    it('should remove webhook by id', async () => {
      const countBefore = await Webhook.model.find({ company: company1 }).countDocuments();

      await request(app)
        .delete(`/api/v2/webhooks/${webhook1._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.NO_CONTENT);

      const countAfter = await Webhook.model.find({ company: company1 }).countDocuments();

      expect(countBefore).to.be.eq(1);
      expect(countAfter).to.be.eq(0);
    });
  });
});
