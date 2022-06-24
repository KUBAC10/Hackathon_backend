import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';
// helpers
import cleanData from 'server/tests/testHelpers/cleanData';
// factories
import {
  companyFactory,
  teamFactory,
  userFactory,
  teamUserFactory
} from 'server/tests/factories';
import _ from 'lodash';

chai.config.includeStack = true;

let team;
let users;
let company;
const password = '123123';
const email = 'asd@example.com';

async function makeTestData() {
  company = await companyFactory({});

  // create power user
  await userFactory({ password, email, company, isPowerUser: true });

  // create tag
  team = await teamFactory({ company });
}

describe('## POST /api/v1/teams/:id/add-team-users', () => {
  before(cleanData);

  before(makeTestData);

  beforeEach(async () => {
    users = await Promise.all(_.flatMap(_.times(2), () => [
      userFactory({ company })
    ]));
  });

  describe('Authorized', () => {
    const agent = request.agent(app);
    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          login: email,
          password
        });
    });

    it('should response success', async () => {
      await agent
        .post(`/api/v1/teams/${team._id}/add-team-users`)
        .send({
          users: users.map(i => i._id)
        })
        .expect(httpStatus.OK);
    });

    it('should response correct teamUsers amount', async () => {
      const res = await agent
        .post(`/api/v1/teams/${team._id}/add-team-users`)
        .send({
          users: users.map(i => i._id)
        })
        .expect(httpStatus.OK);

      expect(res.body.length).to.be.eq(users.length);
    });

    it('should not add not valid users', async () => {
      const res = await agent
        .post(`/api/v1/teams/${team._id}/add-team-users`)
        .send({
          users: [company._id]
        })
        .expect(httpStatus.OK);

      expect(res.body.length).to.be.eq(0);
    });

    it('should not add already exist teamUsers', async () => {
      await teamUserFactory({ company, team, user: users[0] });
      const res = await agent
        .post(`/api/v1/teams/${team._id}/add-team-users`)
        .send({
          users: [users[0]._id]
        })
        .expect(httpStatus.OK);

      expect(res.body.length).to.be.eq(0);
    });
  });

  describe('Unauthorized', () => {
    it('should reject unauthorized', async () => {
      await request(app)
        .post(`/api/v1/teams/${team._id}/add-team-users`)
        .send({
          users: users.map(i => i._id)
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
