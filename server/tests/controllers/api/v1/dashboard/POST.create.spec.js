import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  teamFactory,
  companyFactory,
  userFactory,
  teamUserFactory
} from '../../../../factories';

chai.config.includeStack = true;

let company;
let team;

const email = 'test@email.com';
const password = 'qwe123qwe';

async function makeTestData() {
  company = await companyFactory({ openTextConfig: { disableTextQuestions: true } });
  team = await teamFactory({ company });

  // create users
  const user = await userFactory({
    email,
    password,
    company,
    currentTeam: team,
    isPowerUser: true
  });

  await teamUserFactory({ user, team, company });
}

describe('## GET /api/v1/dashboard/summary', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('As power user', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
      });

      it('should create new dashboard', async () => {
        const res = await agent
          .post('/api/v1/dashboards')
          .send({ name: 'New Dashboard' })
          .expect(httpStatus.CREATED);

        expect(res.body.name).to.be.eq('New Dashboard');
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post('/api/v1/dashboards')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
