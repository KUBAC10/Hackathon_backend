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
  teamFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

let company;

const password = '123123';
const email = 'asd@example.com';
const email2 = 'aasdsd@example.com';

async function makeTestData() {
  company = await companyFactory({});
  const team = await teamFactory({ company });

  // create power User
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('## PUT /api/v1/company-open-text', () => {
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

      it('should update company open text config', async () => {
        const res = await agent
          .put('/api/v1/company-open-text')
          .send({
            active: true,
            popupMessage: 'test test'
          })
          .expect(httpStatus.OK);

        expect(res.body.openTextConfig.active).to.be.eq(true);
        expect(res.body.openTextConfig.popupMessage).to.be.eq('test test');
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

      it('should not update company open text config', async () => {
        await agent
          .put('/api/v1/company-open-text')
          .send({
            active: true,
            popupMessage: 'test test'
          })
          .expect(httpStatus.FORBIDDEN);
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
