import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

import {
  userFactory,
  teamFactory,
  companyFactory,
} from 'server/tests/factories';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import {
  User
} from 'server/models';

chai.config.includeStack = true;

let team;
let company;
const email = 'test@email.com';
const password = 'qwe123qwe';

async function makeTestData() {
  // create company and team
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create Power user
  await userFactory({ email, password, company, isPowerUser: true });
}

describe('## PUT /api/v1/user-self/set-current-team', () => {
  before(cleanData);

  before(makeTestData);

  describe('Unauthorized', () => {
    it('should reject unauthorized', async () => {
      await request(app)
        .put('/api/v1/user-self/set-current-team')
        .send({
          team: team._id.toString()
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
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

    it('should reject without required params', async () => {
      await agent
        .put('/api/v1/user-self/set-current-team')
        .send({})
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should set and return new team to user', async () => {
      const res = await agent
        .put('/api/v1/user-self/set-current-team')
        .send({
          team: team._id.toString()
        })
        .expect(httpStatus.OK);

      const userReload = await User.model.findOne({ email: 'test@email.com' });

      expect(res.body).to.be.eq(team._id.toString());
      expect(res.body).to.be.eq(userReload.currentTeam.toString());
    });
  });
});
