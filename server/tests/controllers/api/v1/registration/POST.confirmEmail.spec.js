import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';
import uuid from 'uuid';

// factories
import {
  userFactory
} from '../../../../factories';

// services
import { redisClient } from '../../../../../services/RedisClientBuilder';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

// config
import config from '../../../../../../config/env';

chai.config.includeStack = true;

let user;

async function makeTestData() {
  user = await userFactory({ isLite: true });
}

describe('## POST /api/v1/registration/lite', () => {
  before(cleanData);

  before(makeTestData);

  it('should return bad request', async () => {
    await request(app)
      .get('/api/v1/registration/confirm/wrongToken')
      .expect(httpStatus.BAD_REQUEST);
  });

  it('should return not found', async () => {
    const token = uuid();

    // set token to redis
    await redisClient.setAsync(`confirmEmailToken:${token}`, '5fb7bab00e0577a08cddfcfe', 'EX', config.ttlConfirmationToken);

    await request(app)
      .get(`/api/v1/registration/confirm/${token}`)
      .expect(httpStatus.NOT_FOUND);
  });

  it('should confirm email', async () => {
    const token = uuid();

    // set token to redis
    await redisClient.setAsync(`confirmEmailToken:${token}`, user._id.toString(), 'EX', config.ttlConfirmationToken);

    const res = await request(app)
      .get(`/api/v1/registration/confirm/${token}`)
      .expect(httpStatus.OK);

    expect(res.body.acceptedAt).not.eq(null);

    const keys = await redisClient.keysAsync('confirmEmailToken:*');

    expect(keys.length).to.be.eq(1);
  });
});
