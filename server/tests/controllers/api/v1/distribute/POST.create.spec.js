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
  userFactory,
  companyLimitationFactory,
  globalConfigFactory
} from '../../../../factories';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'test@email.com';
const email2 = 'test2@email.com';

let company;
let survey;
let limitation;

async function makeTestData() {
  company = await companyFactory({});
  const team = await teamFactory({ company });

  // create survey
  survey = await surveyFactory({ company, team });
  survey = survey._id.toString();

  await globalConfigFactory();

  limitation = await companyLimitationFactory({ company });

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

describe('# POST /api/v1/distribute', () => {
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

      it('should create new email survey campaign', async () => {
        const res = await agent
          .post('/api/v1/distribute')
          .send({
            survey,
            type: 'email'
          })
          .expect(httpStatus.CREATED);

        expect(res.body.type).to.be.eq('email');
        expect(res.body.survey.toString()).to.be.eq(survey);
      });

      xit('should create new mobile survey campaign', async () => {
        const res = await agent
          .post('/api/v1/distribute')
          .send({
            survey,
            type: 'mobile'
          })
          .expect(httpStatus.CREATED);

        expect(res.body.type).to.be.eq('mobile');
        expect(res.body.survey.toString()).to.be.eq(survey);
      });

      it('should reject not found', async () => {
        await agent
          .post('/api/v1/distribute')
          .send({
            survey: company._id.toString(),
            type: 'email'
          })
          .expect(httpStatus.NOT_FOUND);
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

      it('should create new email survey campaign', async () => {
        const res = await agent
          .post('/api/v1/distribute')
          .send({
            survey,
            type: 'email'
          })
          .expect(httpStatus.CREATED);

        expect(res.body.type).to.be.eq('email');
        expect(res.body.survey.toString()).to.be.eq(survey);
      });

      it('should reject by company limitation', async () => {
        limitation.invites = 0;

        await limitation.save();

        const res = await agent
          .post('/api/v1/distribute')
          .send({
            survey,
            type: 'email'
          })
          .expect(httpStatus.BAD_REQUEST);

        expect(res.body.type).to.be.eq('CompanyLimitExceeded');
        expect(res.body.message).to.be.eq('You can\'t create new campaign, because exceed monthly limit of invitations');
      });

      xit('should create new mobile survey campaign', async () => {
        const res = await agent
          .post('/api/v1/distribute')
          .send({
            survey,
            type: 'mobile'
          })
          .expect(httpStatus.CREATED);

        expect(res.body.type).to.be.eq('mobile');
        expect(res.body.survey.toString()).to.be.eq(survey);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post('/api/v1/distribute')
        .send({
          survey,
          type: 'email'
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
