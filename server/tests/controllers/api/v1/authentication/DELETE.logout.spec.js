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

describe('## DELETE /api/v1/authentication', () => {
  before(cleanData);

  before(makeTestData);

  describe('# by User', () => {
    const agent = request.agent(app);

    beforeEach(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          password: userPassword,
          login: user.email
        });
    });

    it('should destroy request jwt token', (done) => {
      agent
        .delete('/api/v1/authentication')
        .expect(httpStatus.OK)
        .then((res) => {
          // get value of jwt cookie
          const jwtValue = res.headers['set-cookie'][0].split(';')[0];
          expect(jwtValue).to.be.eq('jwt=');
          done();
        })
        .catch(done);
    });

    it('should remove auth token from redis', async () => {
      await agent
        .delete('/api/v1/authentication')
        .expect(httpStatus.OK);
      const keys = await redisClient.keysAsync('authToken:*');
      expect(keys.length).to.be.eq(0);
    });
  });
});
