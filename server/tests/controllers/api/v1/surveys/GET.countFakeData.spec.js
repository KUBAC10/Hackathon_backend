import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  userFactory,
  companyFactory,
  teamFactory,
  surveyFactory,
  surveyResultFactory
} from '../../../../factories';

// models
import { User } from '../../../../../models';

chai.config.includeStack = true;

const password = '123123';
const email = 'asd@example.com';

let survey;
let company;
let user;

async function makeTestData() {
  company = await companyFactory({});
  const team = await teamFactory({ company });

  survey = await surveyFactory({ company, team });

  await Promise.all([
    surveyResultFactory({ company, team, survey, fake: true }),
    surveyResultFactory({ company, team, survey, fake: true }),
    surveyResultFactory({ company, team, survey, fake: true }),
    surveyResultFactory({ company, team, survey })
  ]);

  user = await userFactory({
    email,
    password,
    company,
    currentTeam: team,
    isPowerUser: true,
    fakeDataAccess: true
  });
}

describe('## GET /api/v1/surveys/:id/count-hidden-responses', () => {
  beforeEach(cleanData);

  beforeEach(makeTestData);

  describe('Authorized', () => {
    const agent = request.agent(app);
    beforeEach(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          login: email,
          password
        });
    });

    it('should return count of fake results', async () => {
      const res = await agent
        .get(`/api/v1/surveys/${survey._id}/count-fake-data`)
        .expect(httpStatus.OK);

      expect(res.body.count).to.be.eq(3);
    });

    it('should reject by permissions', async () => {
      await User.model.update({ _id: user._id }, { $set: { fakeDataAccess: false } });

      await agent
        .get(`/api/v1/surveys/${survey._id}/count-fake-data`)
        .expect(httpStatus.FORBIDDEN);
    });

    it('should reject with not found status', async () => {
      await agent
        .get(`/api/v1/surveys/${company._id}/count-fake-data`)
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get(`/api/v1/surveys/${survey._id}/count-fake-data`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
