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
  TeamUser
} from 'server/models';

chai.config.includeStack = true;

let team;
let team2;
let company;
const email = 'test@email.com';
const password = 'qwe123qwe';

async function makeTestData() {
  // create company and team
  company = await companyFactory({});
  team = await teamFactory({ company });
  team2 = await teamFactory({ company });

  // create Power user
  await userFactory({ email, password, company, isPowerUser: true });
}

describe('## POST /api/v1/users', () => {
  before(cleanData);

  before(makeTestData);

  const agent = request.agent(app);
  before(async () => {
    await agent
      .post('/api/v1/authentication')
      .send({
        login: email,
        password
      });
  });

  it('should create new user with valid fields', async () => {
    const res = await agent
      .post('/api/v1/users')
      .send({
        userTeams: [team._id.toString(), team2._id.toString()],
        name: { first: 'asd', last: 'asd' },
        email: 'asd@asd.com',
        password: '12314567',
        defaultLanguage: 'en'
      })
      .expect(httpStatus.OK);

    // should create new Team User for each posted team
    const userTeams = await TeamUser.model.find({ user: res.body._id }).lean();
    expect(userTeams.length).to.be.eq(2);

    expect(res.body.email).to.be.eq('asd@asd.com');
    expect(res.body.userTeams.length).to.be.eq(2);
  });
});
