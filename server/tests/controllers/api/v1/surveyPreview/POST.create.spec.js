import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory,
  surveyFactory,
  teamFactory,
  teamUserFactory,
  userFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

const email = 'test@email.com';
const email2 = 'test2@email.com';
const password = 'somePassword99';

let survey;
let user;
let team;
let teamUser;

async function makeTestData() {
  // create team and company
  const company = await companyFactory();
  team = await teamFactory({ company });

  // create survey
  survey = await surveyFactory();

  // create power User
  user = await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('## POST /api/v1/survey-preview', () => {
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

      it('should return created survey preview global token', async () => {
        const res = await agent
          .post('/api/v1/survey-preview')
          .send({
            surveyId: survey._id.toString(),
            type: 'global'
          })
          .expect(httpStatus.OK);
        expect(res.body.survey).to.be.eq(survey._id.toString());
        expect(res.body.user).to.be.eq(user._id.toString());
        expect(res.body.type).to.be.eq('global');
      });

      it('should return created survey preview team token', async () => {
        const res = await agent
          .post('/api/v1/survey-preview')
          .send({
            surveyId: survey._id.toString(),
            type: 'team',
            team: team._id.toString()
          })
          .expect(httpStatus.OK);
        expect(res.body.survey).to.be.eq(survey._id.toString());
        expect(res.body.user).to.be.eq(user._id.toString());
        expect(res.body.company).to.be.eq(user.company._id.toString());
        expect(res.body.type).to.be.eq('team');
      });

      it('should return created survey preview company token', async () => {
        const res = await agent
          .post('/api/v1/survey-preview')
          .send({
            surveyId: survey._id.toString(),
            type: 'company'
          })
          .expect(httpStatus.OK);
        expect(res.body.survey).to.be.eq(survey._id.toString());
        expect(res.body.user).to.be.eq(user._id.toString());
        expect(res.body.company).to.be.eq(user.company._id.toString());
        expect(res.body.type).to.be.eq('company');
      });
    });

    describe('As team user', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should return created survey preview global token', async () => {
        const res = await agent
          .post('/api/v1/survey-preview')
          .send({
            surveyId: survey._id.toString(),
            type: 'global'
          })
          .expect(httpStatus.OK);
        expect(res.body.survey).to.be.eq(survey._id.toString());
        expect(res.body.user).to.be.eq(teamUser._id.toString());
        expect(res.body.type).to.be.eq('global');
      });

      it('should return created survey preview team token', async () => {
        const res = await agent
          .post('/api/v1/survey-preview')
          .send({
            surveyId: survey._id.toString(),
            type: 'team',
            team: team._id.toString()
          })
          .expect(httpStatus.OK);
        expect(res.body.survey).to.be.eq(survey._id.toString());
        expect(res.body.user).to.be.eq(teamUser._id.toString());
        expect(res.body.company).to.be.eq(teamUser.company._id.toString());
        expect(res.body.type).to.be.eq('team');
      });

      it('should return created survey preview company token', async () => {
        const res = await agent
          .post('/api/v1/survey-preview')
          .send({
            surveyId: survey._id.toString(),
            type: 'company'
          })
          .expect(httpStatus.OK);
        expect(res.body.survey).to.be.eq(survey._id.toString());
        expect(res.body.user).to.be.eq(teamUser._id.toString());
        expect(res.body.company).to.be.eq(teamUser.company._id.toString());
        expect(res.body.type).to.be.eq('company');
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post('/api/v1/survey-preview')
        .send({
          surveyId: survey._id.toString(),
          type: 'global'
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
