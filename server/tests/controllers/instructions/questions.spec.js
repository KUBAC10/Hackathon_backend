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
  questionFactory,
  teamUserFactory,
  tagEntityFactory,
} from 'server/tests/factories';

chai.config.includeStack = true;
const agent = request.agent(app);

let tag1;
let tag2;
let tagPower;
let question1;
let question2;
let questionPower;
let exceptedQuestion;
let company;
let team1;
let team2;
let teamUser;
let teamPower;
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
    question1,
    question2,
    questionPower
  ] = await Promise.all([
    questionFactory({ team: team1, trend: true }),
    questionFactory({ team: team1, general: true }),
    questionFactory({ team: teamPower, general: true })
  ]);

  await Promise.all([
    tagEntityFactory({ tag: tag1, question: question1, company }),
    tagEntityFactory({ tag: tag1, question: question2, company }),
    tagEntityFactory({ tag: tagPower, question: questionPower, company })
  ]);

  exceptedQuestion = await questionFactory({ team: team2, trend: true });
  await tagEntityFactory({ tag: tag2, question: exceptedQuestion, company });
}

describe('Questions Instructions', () => {
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

      it('should return list of questions by tag name in company scope', async () => {
        const res1 = await agent
          .get('/api/v1/questions')
          .query({
            limit: 10,
            tagName: 'test1'
          })
          .expect(httpStatus.OK);

        const res2 = await agent
          .get('/api/v1/questions')
          .query({
            limit: 10,
            tagName: 'testPower'
          })
          .expect(httpStatus.OK);

        expect(res1.body.resources.length)
          .to.be.eq(0);

        expect(res2.body.resources.map(i => i._id.toString())).to.include.members([
          questionPower._id.toString(),
        ]);
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

      it('should return list of questions by tag name in team scope', async () => {
        const res = await agent
          .get('/api/v1/questions')
          .query({
            limit: 10,
            tagName: 'test'
          })
          .expect(httpStatus.OK);

        expect(res.body.resources.map(i => i._id.toString()))
          .to.not.include.members([exceptedQuestion._id.toString()]);
      });
    });
  });
});
