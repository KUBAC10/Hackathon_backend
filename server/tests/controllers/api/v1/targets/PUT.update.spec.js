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
let target;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create survey
  survey = await surveyFactory({ company, team });
  survey = survey._id.toString();

  target = await targetFactory({ company, team, survey });

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

describe('# PUT /api/v1/targets/:id', () => {
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

      it('should update target', async () => {
        const res = await agent
          .put(`/api/v1/targets/${target._id}`)
          .send({ name: 'New Name' })
          .expect(httpStatus.OK);

        expect(res.body.name).to.be.eq('New Name');
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

      it('should update target', async () => {
        const res = await agent
          .put(`/api/v1/targets/${target._id}`)
          .send({ name: 'New Name 2' })
          .expect(httpStatus.OK);

        expect(res.body.name).to.be.eq('New Name 2');
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .put(`/api/v1/targets/${survey._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
