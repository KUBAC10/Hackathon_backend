import request from 'supertest';
import httpStatus from 'http-status';
import { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  surveyThemeFactory,
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
  await surveyThemeFactory({ user: teamUser });
}

describe('## POST /api/v1/survye-themes', () => {
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

      it('should create new theme', async () => {
        const res = await agent
          .post('/api/v1/survey-themes')
          .send({
            name: 'New User Theme',
            bgOpacity: 50,
            progressBar: true
          })
          .expect(httpStatus.CREATED);

        expect(res.body.name).to.be.eq('New User Theme');
        expect(res.body.bgOpacity).to.be.eq(50);
        expect(res.body.progressBar).to.be.eq(true);
        expect(res.body.createdBy.toString()).to.be.eq(powerUser._id.toString());
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

      it('should create new theme', async () => {
        const res = await agent
          .post('/api/v1/survey-themes')
          .send({
            name: 'New User Theme',
            bgOpacity: 50,
            progressBar: true
          })
          .expect(httpStatus.CREATED);

        expect(res.body.name).to.be.eq('New User Theme');
        expect(res.body.bgOpacity).to.be.eq(50);
        expect(res.body.progressBar).to.be.eq(true);
        expect(res.body.createdBy.toString()).to.be.eq(teamUser._id.toString());
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return Unauthorized status', async () => {
      await request.agent(app)
        .post('/api/v1/survey-themes')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
