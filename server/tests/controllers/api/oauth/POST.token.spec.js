import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import { clientFactory } from 'server/tests/factories';

chai.config.includeStack = true;

const clientId = 'abcd123';
const clientSecret = 'foobar';

async function makeTestData() {
  await clientFactory({ clientId, clientSecret });
}

describe('## POST /oauth/token', () => {
  before(cleanData);

  before(makeTestData);

  it('should return error for invalid client credentials', async () => {
    await request(app)
      .post('/oauth/token')
      .send({ grant_type: 'client_credentials' })
      .auth('wrong', 'client')
      .expect(httpStatus.UNAUTHORIZED);
  });

  it('should return access token by valid client credentials', async () => {
    const res = await request(app)
      .post('/oauth/token')
      .send({ grant_type: 'client_credentials' })
      .auth('abcd123', 'foobar')
      .expect(httpStatus.OK);

    expect(res.body.access_token).to.be.an('string');
    expect(res.body.token_type).to.be.eq('Bearer');
  });
});
