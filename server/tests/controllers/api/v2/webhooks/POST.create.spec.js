import request from 'supertest';
import chai, { expect } from 'chai';
import faker from 'faker';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';
import v2authRequest from 'server/tests/testHelpers/v2authRequest';

// factories
import {
  clientFactory,
  companyFactory
} from 'server/tests/factories';
import httpStatus from 'http-status';

chai.config.includeStack = true;

let company;

const clientId = 'abcd123';
const clientSecret = 'foobar';

async function makeTestData() {
  company = await companyFactory({});

  await clientFactory({ clientId, clientSecret, company });
}

describe('## POST /api/v2/webhooks', () => {
  before(cleanData);

  before(makeTestData);

  describe('Non authorized', () => {
    it('should return error for non authorized request', async () => {
      await request(app)
        .post('/api/v2/webhooks')
        .send({})
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('Authorized', () => {
    let token;

    before(async () => {
      const res = await v2authRequest(clientId, clientSecret);
      token = res.body.access_token;
    });

    it('should create and return webhook', async () => {
      const urlNew = faker.internet.url();

      const res = await request(app)
        .post('/api/v2/webhooks')
        .send({
          url: urlNew,
          type: '*'
        })
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.CREATED);

      expect(res.body.url).to.be.eq(urlNew);
      expect(res.body.type).to.be.eq('*');
    });

    it('should reject if type is missed', async () => {
      const urlNew = faker.internet.url();

      await request(app)
        .post('/api/v2/webhooks')
        .send({
          url: urlNew
        })
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should reject if url is missed', async () => {
      await request(app)
        .post('/api/v2/webhooks')
        .send({
          type: '*'
        })
        .set('Authorization', `Bearer ${token}`)
        .expect(httpStatus.BAD_REQUEST);
    });
  });
});
