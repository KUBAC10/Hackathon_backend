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
  contactFactory,
  surveyFactory,
  userFactory,
  teamUserFactory,
  questionFactory
} from '../../../../factories';

chai.config.includeStack = true;

let company;
let team;
let team2;
let teamUser;
let anotherTeamUser;

const email = 'test@email.com';
const email2 = 'test2@mail.com';
const email3 = 'test3@mail.com';
const contactEmail = 'contact@mail.com';
const password = 'qwe123qwe';

async function makeTestData() {
  company = await companyFactory({ openTextConfig: { disableTextQuestions: true } });
  team = await teamFactory({ company });
  team2 = await teamFactory({ company });

  await Promise.all([
    surveyFactory({ company, team }),
    userFactory({ email, password, company, currentTeam: team, isPowerUser: true }),
    contactFactory({ email: contactEmail, company, team }),
  ]);

  teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });

  anotherTeamUser = await userFactory({ email: email3, password, company, currentTeam: team2 });
  await teamUserFactory({ user: anotherTeamUser, team: team2, company });
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

      it('should return summary data', async () => {
        const res = await agent
          .get('/api/v1/dashboards/summary')
          .expect(httpStatus.OK);
        expect(res.body).to.be.an('Object');
        expect(res.body.surveys).to.be.eq(1);
        expect(res.body.users).to.be.eq(2);
      });

      it('should exclude text question if it disabled in company config', async () => {
        await Promise.all([
          questionFactory({ company, team, trend: true }),
          questionFactory({ company, team, trend: true, type: 'dropdown' })
        ]);

        const res = await agent
          .get('/api/v1/dashboards/summary')
          .expect(httpStatus.OK);

        expect(res.body.trendQuestions).to.be.eq(1);
      });
    });

    describe('As team user', () => {
      describe('from current team', () => {
        const agent = request.agent(app);
        before(async () => {
          await agent
            .post('/api/v1/authentication')
            .send({
              login: email2,
              password
            });
        });

        it('should return summary data', async () => {
          const res = await agent
            .get('/api/v1/dashboards/summary')
            .expect(httpStatus.OK);
          expect(res.body).to.be.an('Object');
          expect(res.body.surveys).to.be.eq(1);
          expect(res.body.users).to.be.eq(0);
        });
      });

      describe('another team', () => {
        const agent = request.agent(app);
        before(async () => {
          await agent
            .post('/api/v1/authentication')
            .send({
              login: email3,
              password
            });
        });

        it('should return summary data for another team user', async () => {
          await agent
            .get('/api/v1/dashboards/summary')
            .expect(httpStatus.OK);
        });
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get('/api/v1/dashboards/summary')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
