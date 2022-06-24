import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  userFactory,
  companyFactory,
  teamFactory,
  emailFactory,
  contentFactory,
} from '../../../../factories';

// helpers
import { APIMessagesExtractor } from '../../../../../services';

chai.config.includeStack = true;

let emailTo;
let content;
let company;

const email = 'test@email.com';
const email2 = 'test2@mail.com';
const password = 'qwe123qwe';

async function makeTestData() {
  // create company and team
  company = await companyFactory({});
  const team = await teamFactory({ company });

  // create email
  emailTo = await emailFactory({ company });

  // create power User
  await userFactory({
    email,
    password,
    company,
    currentTeam: team,
    isPowerUser: true
  });

  // create team user
  await userFactory({
    email: email2,
    password,
    company,
    currentTeam: team
  });

  // load content
  content = await contentFactory({});
  await APIMessagesExtractor.loadData();
}

describe('## POST /api/v1/emails/resend - Resend email', () => {
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

      it('should return message that the email was resend', async () => {
        const res = await agent
          .post('/api/v1/emails/resend')
          .send({
            email: emailTo._id.toString()
          })
          .expect(httpStatus.OK);
        expect(res.body.message).to.be.eq(content.apiMessages.email.wasResend);
      });

      it('should reject if doc not found', async () => {
        await agent
          .post('/api/v1/emails/resend')
          .send({ email: company._id.toString() })
          .expect(httpStatus.NOT_FOUND);
      });

      it('should reject by scopes', async () => {
        emailTo = await emailFactory({ company: emailTo });

        await agent
          .post('/api/v1/emails/resend')
          .send({ email: emailTo._id.toString() })
          .expect(httpStatus.FORBIDDEN);
      });
    });

    describe('As team user', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should return forbidden from not power user', async () => {
        await agent
          .post('/api/v1/emails/resend')
          .send({
            email: emailTo._id.toString()
          })
          .expect(httpStatus.FORBIDDEN);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post('/api/v1/emails/resend')
        .send({
          email: emailTo._id.toString()
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
