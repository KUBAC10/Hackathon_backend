import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from '../../../../../../index';

// factories
import {
  companyFactory,
  surveyFactory,
  teamFactory,
  teamUserFactory,
  userFactory
} from '../../../../factories';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'test@email.com';
const email2 = 'test2@email.com';

let company;
let team;
let survey;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create survey
  survey = await surveyFactory({ company, team });
  survey = survey._id.toString();

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const user = await userFactory({
    email: email2,
    password,
    company,
    currentTeam: team,
    isLite: true
  });

  await teamUserFactory({ user, team, company });
}

describe('# POST /api/v1/targets', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('As Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
      });

      it('should create target', async () => {
        const res = await agent
          .post('/api/v1/targets')
          .send({
            survey,
            name: 'New Target'
          })
          .expect(httpStatus.CREATED);

        expect(res.body.name).to.be.eq('New Target');
        expect(res.body.survey.toString()).to.be.eq(survey);
        expect(res.body.team.toString()).to.be.eq(team._id.toString());
        expect(res.body.company.toString()).to.be.eq(company._id.toString());
        expect(res.body.surveyCampaigns).to.be.an('array');
        expect(res.body.surveyCampaigns.length).to.be.eq(0);
      });
    });

    describe('As Team User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should create target', async () => {
        const res = await agent
          .post('/api/v1/targets')
          .send({
            survey,
            name: 'New Target'
          })
          .expect(httpStatus.CREATED);

        expect(res.body.name).to.be.eq('New Target');
        expect(res.body.survey.toString()).to.be.eq(survey);
        expect(res.body.team.toString()).to.be.eq(team._id.toString());
        expect(res.body.company.toString()).to.be.eq(company._id.toString());
        expect(res.body.surveyCampaigns).to.be.an('array');
        expect(res.body.surveyCampaigns.length).to.be.eq(0);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post('/api/v1/targets')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
