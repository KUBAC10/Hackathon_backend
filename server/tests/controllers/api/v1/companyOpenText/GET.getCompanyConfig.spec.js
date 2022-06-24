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
  teamUserFactory,
  teamFactory,
  consentFactory,
  surveyFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

let company;
let survey;
const password = '123123';
const email = 'asd@example.com';
const email2 = 'aasdsd@example.com';

async function makeTestData() {
  company = await companyFactory({ openTextConfig: { active: true, requiredNotifications: true } });
  const team = await teamFactory({ company });

  // create survey
  survey = await surveyFactory({ team, company });

  // create power User
  const user = await userFactory({
    email,
    password,
    company,
    currentTeam: team,
    isPowerUser: true
  });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });

  // create consent
  await consentFactory({ user, survey });
}

describe('## GET /api/v1/company-open-text', () => {
  beforeEach(cleanData);

  beforeEach(makeTestData);

  describe('Authorized', () => {
    describe('As Power User', () => {
      const agent = request.agent(app);
      beforeEach(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
      });

      it('should response open text configuration for company', async () => {
        const res = await agent
          .get('/api/v1/company-open-text')
          .query()
          .expect(httpStatus.OK);

        expect(res.body.openTextConfig.active).to.be.eq(true);
        expect(res.body.openTextConfig.requiredNotifications).to.be.eq(true);
      });

      it('should response true if consent is present', async () => {
        const res = await agent
          .get('/api/v1/company-open-text')
          .query({
            surveyId: survey._id.toString()
          })
          .expect(httpStatus.OK);

        expect(res.body.consent).to.be.eq(true);
      });
    });

    describe('As Team User', () => {
      const agent = request.agent(app);
      beforeEach(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should response open text configuration for company', async () => {
        const res = await agent
          .get('/api/v1/company-open-text')
          .send({})
          .expect(httpStatus.OK);

        expect(res.body.openTextConfig.active).to.be.eq(true);
        expect(res.body.openTextConfig.requiredNotifications).to.be.eq(true);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .put('/api/v1/company-colors')
        .send({
          active: true,
          popupMessage: 'test test'
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
