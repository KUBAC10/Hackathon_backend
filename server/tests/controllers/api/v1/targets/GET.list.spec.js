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

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create survey
  survey = await surveyFactory({ company, team });
  survey = survey._id.toString();

  await Promise.all([
    targetFactory({ company, team, survey }),
    targetFactory({ company, team, survey }),
    targetFactory({ company, team, survey }),
    targetFactory({ company, team })
  ]);

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

describe('# GET /api/v1/targets', () => {
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

      it('should return list of survey targets', async () => {
        const res = await agent
          .get('/api/v1/targets')
          .query({ survey })
          .expect(httpStatus.OK);

        expect(res.body.resources).to.be.an('array');
        expect(res.body.resources.length).to.be.eq(3);
        expect(res.body.total).to.be.eq(3);
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

      it('should return list of survey targets', async () => {
        const res = await agent
          .get('/api/v1/targets')
          .query({ survey })
          .expect(httpStatus.OK);

        expect(res.body.resources).to.be.an('array');
        expect(res.body.resources.length).to.be.eq(3);
        expect(res.body.total).to.be.eq(3);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get('/api/v1/targets')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
