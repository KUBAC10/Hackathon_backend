import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from '../../../../../../index';

// models
import { Target } from '../../../../../models';

// factories
import {
  companyFactory,
  surveyFactory,
  teamFactory,
  teamUserFactory,
  userFactory,
  targetFactory
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

describe('# DELETE /api/v1/targets/:id', () => {
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

      it('should remove target', async () => {
        const target = await targetFactory({ company, team, survey });

        await agent
          .delete(`/api/v1/targets/${target._id}`)
          .expect(httpStatus.NO_CONTENT);

        const reload = await Target.model.findById(target._id).lean();

        expect(reload).to.be.eq(null);
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

      it('should remove target', async () => {
        const target = await targetFactory({ company, team, survey });

        await agent
          .delete(`/api/v1/targets/${target._id}`)
          .expect(httpStatus.NO_CONTENT);

        const reload = await Target.model.findById(target._id).lean();

        expect(reload).to.be.eq(null);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .delete(`/api/v1/targets/${survey._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
