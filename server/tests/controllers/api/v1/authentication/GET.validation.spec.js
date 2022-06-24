import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';

import app from 'index';

// helpers
import { redisClient } from 'server/services/RedisClientBuilder';
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import userFactory from 'server/tests/factories/user.factory';

chai.config.includeStack = true;

let user;
const userPassword = '123123';

async function makeTestData() {
  user = await userFactory({ password: userPassword });
}

describe('## GET /api/v1/authentication', () => {
  before(cleanData);

  before(makeTestData);

  describe('# unauthorized GET /api/v1/authentication', () => {
    it('should reject without jtw cookies', (done) => {
      request(app)
        .get('/api/v1/authentication')
        .expect(httpStatus.UNAUTHORIZED)
        .then(() => done())
        .catch(done);
    });

    const agent = request.agent(app);

    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          password: userPassword,
          login: user.email
        });
    });

    it('should reject when token in Redis store was expired', (done) => {
      redisClient.flushdb();
      agent
        .get('/api/v1/authentication')
        .expect(httpStatus.UNAUTHORIZED)
        .then(() => done())
        .catch(done);
    });
  });

  describe('# authorized GET /api/v1/authentication', () => {
    const agent = request.agent(app);

    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          password: userPassword,
          login: user.email
        });
    });

    it('should return user', (done) => {
      agent
        .get('/api/v1/authentication')
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body.name.first).to.equal(user.name.first);
          done();
        })
        .catch(done);
    });
  });
});
