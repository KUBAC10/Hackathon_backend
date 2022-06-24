import request from 'supertest';
import faker from 'faker';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import User from 'server/models/User';

// factories
import userFactory from 'server/tests/factories/user.factory';
import contentFactory from 'server/tests/factories/content.factory';

// services
import APIMessagesExtractor from 'server/services/APIMessagesExtractor';

chai.config.includeStack = true;

let user;
let content;
let email;
const password = 'qwe123qwe';
const newPassword = 'newpassword123';

async function makeTestData() {
  content = await contentFactory({});
  await APIMessagesExtractor.loadData();
}

describe('# PUT authorized /api/v1/user-self/update-password', () => {
  after(cleanData);

  before(makeTestData);

  const agent = request.agent(app);
  beforeEach(async () => {
    email = faker.internet.email().toLowerCase();
    user = await userFactory({ password, email });

    await agent
      .post('/api/v1/authentication')
      .send({
        password,
        login: email
      });
  });

  it('should update user password', async () => {
    await agent
      .put('/api/v1/user-self/update-password')
      .send({
        oldPassword: password,
        password: newPassword,
        confirmPassword: newPassword
      })
      .expect(httpStatus.NO_CONTENT);

    const reloadedUser = await User.model.findById(user._id);

    reloadedUser._.password.compare(newPassword, (err, isMatch) => {
      expect(isMatch).to.be.eq(true);
    });
  });

  it('should return error for difference password and confirm password', async () => {
    const res = await agent
      .put('/api/v1/user-self/update-password')
      .send({
        oldPassword: password,
        password: 'qweqweqw',
        confirmPassword: newPassword
      })
      .expect(httpStatus.BAD_REQUEST);

    expect(res.body.message.confirmPassword).to.be.eq(content.apiErrors.password.confirm);
  });

  it('should return error for invalid old password', async () => {
    const res = await agent
      .put('/api/v1/user-self/update-password')
      .send({
        oldPassword: 'zzzzzzzzz',
        password: newPassword,
        confirmPassword: newPassword
      })
      .expect(httpStatus.BAD_REQUEST);

    expect(res.body.message.oldPassword).to.be.eq(content.apiErrors.password.notMatch);
  });

  it('should reject for unauthorized user', async () => {
    await request(app)
      .put('/api/v1/user-self/update-password')
      .expect(httpStatus.UNAUTHORIZED);
  });
});
