import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// factories
import {
  userFactory,
  teamFactory,
  companyFactory,
  surveyFactory
} from 'server/tests/factories/';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';
import APIMessagesExtractor from 'server/services/APIMessagesExtractor';

chai.config.includeStack = true;

let team;
let survey;
let publicSurvey;
let company;
const password = 'qwe123qwe';
const email = 'test@email.com';

async function makeTestData() {
  // create company and team
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  [
    survey,
    publicSurvey
  ] = await Promise.all([
    surveyFactory({ company, team }),
    surveyFactory({ company, team, publicAccess: true })
  ]);

  await APIMessagesExtractor.loadData();
}

describe('## POST /api/v1/invitation', () => {
  before(cleanData);

  before(makeTestData);

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

    it('should not return error when invite was sent on public survey', async () => {
      await agent
        .post('/api/v1/invitation')
        .send({
          survey: publicSurvey._id
        })
        .expect(httpStatus.OK);
    });

    it('should return error if survey id does not exist', async () => {
      await agent
        .post('/api/v1/invitation')
        .send({
          survey: team._id
        })
        .expect(httpStatus.NOT_FOUND);
    });

    it('should create invitation and send link', async () => {
      const res = await agent
        .post('/api/v1/invitation')
        .send({
          survey: survey._id
        })
        .expect(httpStatus.OK);

      expect(res.body.link).to.be.an('string');
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post('/api/v1/invitation')
        .send({
          survey: survey._id
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
