import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  tagFactory,
  teamFactory,
  userFactory,
  companyFactory,
  surveyFactory,
  teamUserFactory,
  tagEntityFactory,
} from 'server/tests/factories';

chai.config.includeStack = true;
const agent = request.agent(app);

let tag1;
let tag2;
let tagPower;
let survey1;
let survey2;
let surveyPower;
let exceptedSurvey;
let company;
let team1;
let team2;
let teamPower;
let teamUser;
const email = 'test@email.com';
const teamUserEmail = 'test1@email.com';
const password = '123123123';

async function makeTestData() {
  // Create company
  company = await companyFactory({});

  // create teams
  [
    team1,
    team2,
    teamPower
  ] = await Promise.all([
    teamFactory({ company }),
    teamFactory({ company }),
    teamFactory({ company })
  ]);

  // Create Power User with team
  const powerUser = await userFactory({
    email,
    password,
    company,
    isPowerUser: true,
    currentTeam: teamPower
  });
  await teamUserFactory({ user: powerUser, team: teamPower, company });

  // create company-team1 team user
  teamUser = await userFactory({ email: teamUserEmail, password, company, currentTeam: team1 });
  await teamUserFactory({ user: teamUser, team: team1, company });

  // Create contacts with tags
  [
    tag1,
    tag2,
    tagPower
  ] = await Promise.all([
    tagFactory({ company, name: 'test1', team: team1 }),
    tagFactory({ company, name: 'test2', team: team2 }),
    tagFactory({ company, name: 'testPower', team: teamPower })
  ]);

  [
    survey1,
    survey2,
    surveyPower
  ] = await Promise.all([
    surveyFactory({ team: team1 }),
    surveyFactory({ team: team1 }),
    surveyFactory({ team: teamPower })
  ]);

  await Promise.all([
    tagEntityFactory({ tag: tag1, survey: survey1, company }),
    tagEntityFactory({ tag: tag1, survey: survey2, company }),
    tagEntityFactory({ tag: tagPower, survey: surveyPower, company })
  ]);

  exceptedSurvey = await surveyFactory({ team: team2 });
  await tagEntityFactory({ tag: tag2, survey: exceptedSurvey, company });
}

describe('Surveys Instructions', () => {
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

      it('should return list of surveys by tag name in company scope', async () => {
        const res1 = await agent
          .get('/api/v1/surveys')
          .query({
            limit: 10,
            tagName: 'test1'
          })
          .expect(httpStatus.OK);

        const res2 = await agent
          .get('/api/v1/surveys')
          .query({
            limit: 10,
            tagName: 'testPower'
          })
          .expect(httpStatus.OK);

        expect(res1.body.resources.length).to.be.eq(0);

        expect(res2.body.resources.map(i => i._id.toString()))
          .to.include.members([surveyPower._id.toString()]);
      });
    });

    describe('As Team User', () => {
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: teamUserEmail
          });
      });

      it('should return list of surveys by tag name in team scope', async () => {
        const res = await agent
          .get('/api/v1/surveys')
          .query({
            limit: 10,
            tagName: 'test'
          })
          .expect(httpStatus.OK);

        expect(res.body.resources.map(i => i._id.toString()))
          .to.not.include.members([exceptedSurvey._id.toString()]);
      });
    });
  });
});
