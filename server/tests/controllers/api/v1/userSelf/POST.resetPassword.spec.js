import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// services
import { redisClient } from '../../../../../services/RedisClientBuilder';

// factories
import {
  userFactory,
  globalConfigFactory
} from '../../../../factories';

chai.config.includeStack = true;

const email = 'asd@example.com';

async function makeTestData() {
  await userFactory({ email });
  await globalConfigFactory();
}

describe('# POST /api/v1/user-self/reset-password', () => {
  before(cleanData);

  before(makeTestData);

  it('should return not found if user with same email doesn\'t exist', async () => {
    await request(app)
      .post('/api/v1/user-self/reset-password')
      .send({
        email: 'some-fake@email.com'
      })
      .expect(httpStatus.NOT_FOUND);
  });

  it('should set reset password token to Redis', async () => {
    let keys = await redisClient.keysAsync('resetPasswordToken:*');

    expect(keys.length).to.be.eq(0);

    await request(app)
      .post('/api/v1/user-self/reset-password')
      .send({
        email
      })
      .expect(httpStatus.ACCEPTED);

    keys = await redisClient.keysAsync('resetPasswordToken:*');

    expect(keys.length).to.be.eq(1);
  });
});
