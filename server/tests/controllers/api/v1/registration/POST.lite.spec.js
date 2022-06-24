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

describe('## POST /api/v1/registration/lite', () => {
  before(cleanData);

  it('should return error if email is already registered', async () => {
    const user = await userFactory({});

    const res = await request(app)
      .post('/api/v1/registration/lite')
      .send({
        email: user.email,
        firstName: 'firstName',
        lastName: 'lastName',
        password: 'password'
      })
      .expect(httpStatus.BAD_REQUEST);

    // drop confirm email keys
    await redisClient.flushdb();

    expect(res.body.message.email).to.be.eq('User with this email already exists');
  });

  it('should create new lite user', async () => {
    const res = await request(app)
      .post('/api/v1/registration/lite')
      .send({
        email: 'example@email.com',
        firstName: 'Lite',
        lastName: 'User',
        password: 'password'
      })
      .expect(httpStatus.OK);

    expect(res.body.name.first).to.be.eq('Lite');
    expect(res.body.name.last).to.be.eq('User');
    expect(res.body.email).to.be.eq('example@email.com');
    expect(res.body.defaultLanguage).to.be.eq('en');
    expect(res.body.isLite).to.be.eq(true);
    expect(res.body.acceptedAt).to.be.eq(undefined);

    const keys = await redisClient.keysAsync('*');

    expect(keys.length).to.be.eq(2);
  });
});
