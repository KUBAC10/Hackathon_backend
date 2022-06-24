import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';
import uuid from 'uuid/v4';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// services
import { redisClient } from '../../../../../services/RedisClientBuilder';

// models
import { User } from '../../../../../../server/models';

// factories
import {
  userFactory,
  globalConfigFactory
} from '../../../../factories';

// config
import config from '../../../../../../config/env';

chai.config.includeStack = true;

const email = 'asd@example.com';
const password = '12345678q';
let user;

async function makeTestData() {
  user = await userFactory({ email, password });
  await globalConfigFactory();
}

describe('## PUT /api/v1/user-self/set-password', () => {
  before(cleanData);

  before(makeTestData);

  describe('# PUT Authorized ', () => {
    const agent = request.agent(app);

    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          login: email,
          password
        });
    });

    it('should reject bad request if password don\'t match', async () => {
      await agent
        .put('/api/v1/user-self/set-password')
        .send({
          password: 'some-password',
          confirmPassword: 'bad-password'
        })
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return status no found if token not exist in redis', async () => {
      const token = uuid();

      await agent
        .put('/api/v1/user-self/set-password')
        .send({
          password: 'some-password',
          confirmPassword: 'some-password',
          resetToken: token
        })
        .expect(httpStatus.NOT_FOUND);
    });

    it('should return status bad request if set without reset-token', async () => {
      await agent
        .put('/api/v1/user-self/set-password')
        .send({
          password: 'some-password',
          confirmPassword: 'some-password'
        })
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return status no content and reset password for user', async () => {
      const token = uuid();

      await redisClient.setAsync(`resetPasswordToken:${token}`, user._id.toString(), 'EX', config.ttlConfirmationToken);

      await agent
        .put('/api/v1/user-self/set-password')
        .send({
          password: 'new-password',
          confirmPassword: 'new-password',
          resetToken: token
        })
        .expect(httpStatus.NO_CONTENT);

      const reloadUser = await User.model.findById(user._id);

      expect(user.password).to.not.eq(reloadUser.password);
    });
  });

  describe('# PUT Unauthorized ', () => {
    it('should reject bad request', async () => {
      const res = await request(app)
        .put('/api/v1/user-self/set-password')
        .send({
          password,
          confirmPassword: password
        })
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message).eq('User or reset-token is not present');
    });
  });
});
