import request from 'supertest';
import httpStatus from 'http-status';
import { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  surveyThemeFactory,
  teamUserFactory,
  userFactory
} from '../../../../factories';

const password = 'qwe123qwe';
const email = 'poweser@email.com';
const email2 = 'teamusser@email.com';

let powerUser;
let teamUser;

async function makeTestData() {
  // create Power Users
  powerUser = await userFactory({ email, password, isPowerUser: true });

  // create Team user
  teamUser = await userFactory({ email: email2, password });
  await teamUserFactory({ user: teamUser });
}

describe('## GET /api/v1/survey-themes/:id', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('As Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email
          });
      });

      it('should return global theme', async () => {
        const theme = await surveyThemeFactory({ type: 'global' });

        const res = await agent
          .get(`/api/v1/survey-themes/${theme._id}`)
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(theme._id.toString());
      });

      it('should return user theme', async () => {
        const theme = await surveyThemeFactory({ createdBy: powerUser._id });

        const res = await agent
          .get(`/api/v1/survey-themes/${theme._id}`)
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(theme._id.toString());
      });

      it('should return status not found', async () => {
        const theme = await surveyThemeFactory({ createdBy: teamUser._id });

        await agent
          .get(`/api/v1/survey-themes/${theme._id}`)
          .expect(httpStatus.NOT_FOUND);
      });
    });

    describe('As Team User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email2
          });
      });

      it('should return global theme', async () => {
        const theme = await surveyThemeFactory({ type: 'global' });

        const res = await agent
          .get(`/api/v1/survey-themes/${theme._id}`)
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(theme._id.toString());
      });

      it('should return user theme', async () => {
        const theme = await surveyThemeFactory({ createdBy: teamUser._id });

        const res = await agent
          .get(`/api/v1/survey-themes/${theme._id}`)
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(theme._id.toString());
      });

      it('should return status not found', async () => {
        const theme = await surveyThemeFactory({ createdBy: powerUser._id });

        await agent
          .get(`/api/v1/survey-themes/${theme._id}`)
          .expect(httpStatus.NOT_FOUND);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return Unauthorized status', async () => {
      await request.agent(app)
        .get(`/api/v1/survey-themes/${teamUser._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
