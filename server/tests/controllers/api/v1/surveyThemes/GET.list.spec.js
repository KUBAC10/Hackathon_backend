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

  await Promise.all([
    surveyThemeFactory({ name: 'theme1', createdBy: powerUser._id }),
    surveyThemeFactory({ name: 'theme2', createdBy: teamUser._id }),
    surveyThemeFactory({ type: 'global' })
  ]);
}

describe('## GET /api/v1/survey-themes', () => {
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

      it('should return list of global themes', async () => {
        const res = await agent
          .get('/api/v1/survey-themes')
          .query({ limit: 10 })
          .expect(httpStatus.OK);

        expect(res.body.resources.length).to.be.eq(1);
        expect(res.body.total).to.be.eq(1);
      });

      it('should return list of user themes', async () => {
        const res = await agent
          .get('/api/v1/survey-themes')
          .query({ limit: 10, own: true, name: 'them' })
          .expect(httpStatus.OK);

        expect(res.body.resources.length).to.be.eq(1);
        expect(res.body.total).to.be.eq(1);
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

      it('should return list of global themes', async () => {
        const res = await agent
          .get('/api/v1/survey-themes')
          .query({ limit: 10 })
          .expect(httpStatus.OK);

        expect(res.body.resources.length).to.be.eq(1);
        expect(res.body.total).to.be.eq(1);
      });

      it('should return list of user themes', async () => {
        const res = await agent
          .get('/api/v1/survey-themes')
          .query({ limit: 10, own: true })
          .expect(httpStatus.OK);

        expect(res.body.resources.length).to.be.eq(1);
        expect(res.body.total).to.be.eq(1);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return Unauthorized status', async () => {
      await request.agent(app)
        .get('/api/v1/survey-themes')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
