import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory,
  questionFactory,
  teamFactory,
  userFactory,
  teamUserFactory,
  surveyItemFactory,
  surveyFactory,
} from '../../../../factories';

chai.config.includeStack = true;

let company;
let team;

let surveys;

let question;

const email1 = 'test1@email.com';
const email2 = 'test2@email.com';
const password = 'qwe123qwe';

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  question = await questionFactory({ company, team });

  surveys = await Promise.all([
    surveyFactory({ company, team }),
    surveyFactory({ company, team }),
    surveyFactory({ company, team })
  ]);

  surveys = surveys.map(s => s._id.toString());

  await Promise.all([
    surveyItemFactory({ company, team, question, type: 'trendQuestion', survey: surveys[0] }),
    surveyItemFactory({ company, team, question, type: 'trendQuestion', survey: surveys[1] }),
    surveyItemFactory({ company, team, question, type: 'trendQuestion', survey: surveys[2] })
  ]);

  await userFactory({
    password,
    company,
    currentTeam: team,
    email: email1,
    isPowerUser: true
  });

  const teamUser = await userFactory({
    password,
    company,
    email: email2,
    currentTeam: team
  });

  await teamUserFactory({ company, team, user: teamUser });
}

describe('## DELETE /api/v1/questions/:id/report', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    const agent = request.agent(app);

    describe('by Power User', () => {
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email1,
            password
          });
      });

      it('should return trend question surveys', async () => {
        const res = await agent
          .get(`/api/v1/questions/${question._id}/surveys`)
          .expect(httpStatus.OK);

        expect(res.body.every(s => surveys.includes(s._id.toString()))).to.be.eq(true);
        expect(res.body.every(s => s.questionsCount === 0)).to.be.eq(true);
      });
    });

    describe('by Team User', () => {
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should return trend question surveys', async () => {
        const res = await agent
          .get(`/api/v1/questions/${question._id}/surveys`)
          .expect(httpStatus.OK);

        expect(res.body.every(s => surveys.includes(s._id.toString()))).to.be.eq(true);
        expect(res.body.every(s => s.questionsCount === 0)).to.be.eq(true);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get(`/api/v1/questions/${company._id}/surveys`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
