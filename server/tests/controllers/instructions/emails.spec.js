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
  emailFactory,
  teamUserFactory,
  mailerFactory
} from 'server/tests/factories';

chai.config.includeStack = true;
const agent = request.agent(app);

let emailTo;
let teamUser;
let mailer;

const email = 'test@email.com';
const email2 = 'test2@mail.com';
const password = '123123123';

async function makeTestData() {
  // create team and company
  const company = await companyFactory({});
  const team = await teamFactory({ company });

  // create power user
  await userFactory({ email, password, company, isPowerUser: true });

  // create company-team1 team user
  teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });

  // create mailer and email
  mailer = await mailerFactory({ company });
  emailTo = await emailFactory({ name: 'testName', company, user: teamUser, mailer });
}

describe('## Emails Instructions', () => {
  before(cleanData);

  before(makeTestData);

  describe('# List', () => {
    describe('As Power User', () => {
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email
          });
      });

      it('should return list of emails', async () => {
        const res = await agent
          .get('/api/v1/emails')
          .query({
            limit: 10,
            type: 'email',
            lang: 'en',
            user: teamUser._id.toString(),
            mailer: mailer._id.toString()
          })
          .expect(httpStatus.OK);
        expect(res.body.resources.map(i => i._id.toString())).to.include.members([
          emailTo._id.toString(),
        ]);
      });

      it('should return list of emails by name', async () => {
        const res = await agent
          .get('/api/v1/emails')
          .query({
            limit: 10,
            name: 'wrong name'
          })
          .expect(httpStatus.OK);
        expect(res.body.resources.map(i => i._id.toString())).not.to.include.members([
          emailTo._id.toString(),
        ]);
      });
    });

    describe('As Team User', () => {
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email2
          });
      });

      it('should return forbidden status', async () => {
        await agent
          .get('/api/v1/emails')
          .query({
            limit: 10
          })
          .expect(httpStatus.FORBIDDEN);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get('/api/v1/emails')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
