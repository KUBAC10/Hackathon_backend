import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';

import app from 'index'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import userFactory from 'server/tests/factories/user.factory';

// services
import { redisClient } from 'server/services/RedisClientBuilder';

chai.config.includeStack = true;

let user;
const userPassword = '123123';

async function makeTestData() {
  user = await userFactory({ password: userPassword });
}

describe('## POST /api/v1/authentication', () => {
  before(cleanData);

  before(makeTestData);

  it('should login user through email and return user info', (done) => {
    request(app)
      .post('/api/v1/authentication')
      .send({
        login: user.email,
        password: userPassword
      })
      .expect(httpStatus.OK)
      .then((res) => {
        expect(res.body.name.first).to.equal(user.name.first);
        done();
      })
      .catch(done);
  });

  it('should reject with invalid credentials', (done) => {
    request(app)
      .post('/api/v1/authentication')
      .send({
        login: 'user@example1.com',
        password: '12345678'
      })
      .expect(httpStatus.BAD_REQUEST)
      .then(() => done())
      .catch(done);
  });

  it('should reject without email', (done) => {
    request(app)
      .post('/api/v1/authentication')
      .send({
        password: 'wrongPass'
      })
      .expect(httpStatus.BAD_REQUEST)
      .then(() => done())
      .catch(done);
  });

  it('should set auth token to Redis', async () => {
    await request(app)
      .post('/api/v1/authentication')
      .send({
        login: user.email,
        password: userPassword
      })
      .expect(httpStatus.OK);
    const keys = await redisClient.keysAsync('authToken:*');
    expect(keys.length).to.be.eq(1);
  });
});
