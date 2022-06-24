import request from 'supertest';
import httpStatus from 'http-status';
import chai from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  userFactory,
} from 'server/tests/factories/index';

chai.config.includeStack = true;

const agent = request.agent(app);

const email1 = 'test@email.com';
const email2 = 'test1@email.com';
const password = '123123123';

let powerUserWithoutCompany;

async function makeTestData() {
  // power user without company
  powerUserWithoutCompany = await userFactory({ email: email1, password, isPowerUser: true });
  powerUserWithoutCompany.company = undefined;
  await powerUserWithoutCompany.save();

  // valid power user
  await userFactory({ email: email2, password, isPowerUser: true });
}

describe('## Power User Access', () => {
  before(cleanData);

  before(makeTestData);

  it('should reject with status forbidden when power user has no company', async () => {
    await agent
      .post('/api/v1/authentication')
      .send({
        password,
        login: email1
      });

    await agent
      .get('/api/v1/teams')
      .query({
        limit: 10
      })
      .expect(httpStatus.FORBIDDEN);
  });

  it('should response with status Ok for valid power user', async () => {
    await agent
      .post('/api/v1/authentication')
      .send({
        password,
        login: email2
      });

    await agent
      .get('/api/v1/teams')
      .query({
        limit: 10
      })
      .expect(httpStatus.OK);
  });
});
