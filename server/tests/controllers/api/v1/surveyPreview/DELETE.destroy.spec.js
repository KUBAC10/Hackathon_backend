import request from 'supertest';
import httpStatus from 'http-status';
import chai from 'chai';
import app from 'index';
import uuid from 'uuid/v4';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  userFactory,
  teamFactory,
  companyFactory,
  inviteFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

let team;
let company;
let previewToken;

const password = 'qwe123qwe';
const email = 'test@email.com';

async function makeTestData() {
  // create company and team
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create Power user
  const powerUser = await userFactory({
    email, password, company, currentTeam: team, isPowerUser: true
  });

  // create test data
  previewToken = await inviteFactory({
    company,
    token: uuid(),
    user: powerUser,
    type: 'global',
    createdBy: powerUser
  });
}

describe('## DELETE /api/v1/survey-preview/:id', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('as Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
      });

      it('should remove preview token by id', async () => {
        await agent
          .delete(`/api/v1/survey-preview/${previewToken._id.toString()}`)
          .expect(httpStatus.NO_CONTENT);
      });

      it('should reject if token does not exists', async () => {
        await agent
          .delete(`/api/v1/survey-preview/${company._id.toString()}`)
          .expect(httpStatus.NOT_FOUND);
      });

      it('should reject by scopes', async () => {
        previewToken = await inviteFactory({ token: uuid(), type: 'global' });

        await agent
          .delete(`/api/v1/survey-preview/${previewToken._id.toString()}`)
          .expect(httpStatus.FORBIDDEN);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .delete(`/api/v1/survey-preview/${previewToken._id.toString()}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
