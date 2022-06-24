import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// factories
import {
  userFactory
} from '../../../../factories';

// services
import { redisClient } from '../../../../../services/RedisClientBuilder';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

chai.config.includeStack = true;

const password = 'password';
const email = 'test1@email.com';

async function makeTestData() {
  await userFactory({ email, password, isLite: true });
}

describe('## GET /api/v1/registration/resend-confirm-email', () => {
  before(cleanData);

  before(makeTestData);

  const agent = request.agent(app);

  before(async () => {
    await agent
      .post('/api/v1/authentication')
      .send({
        login: email,
        password
      });
  });

  it('should write new toke for user in redis', async () => {
    let keys = await redisClient.keysAsync('confirmEmailToken:*');

    expect(keys.length).to.be.eq(1);

    await agent
      .get('/api/v1/registration/resend-confirm-email')
      .expect(httpStatus.OK);

    keys = await redisClient.keysAsync('confirmEmailToken:*');

    expect(keys.length).to.be.eq(2);
  });
});
