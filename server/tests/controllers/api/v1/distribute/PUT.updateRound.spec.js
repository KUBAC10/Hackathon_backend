import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from '../../../../../../index';

// factories
import {
  companyFactory,
  pulseSurveyRoundFactory,
  surveyCampaignFactory,
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

let survey;
let surveyCampaign;
let pulseSurveyRound;

async function makeTestData() {
  const company = await companyFactory({});
  const team = await teamFactory({ company });

  // create survey
  survey = await surveyFactory({ company, team });

  surveyCampaign = await surveyCampaignFactory({ company, team, survey });

  pulseSurveyRound = await pulseSurveyRoundFactory({ surveyCampaign });

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const user = await userFactory({ email: email2, password, company, currentTeam: team });

  await teamUserFactory({ user, team, company });
}

describe('# GET /api/v1/distribute', () => {
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

      it('should return list of survey campaigns', async () => {
        const res = await agent
          .put(`/api/v1/distribute/${surveyCampaign._id}/rounds/${pulseSurveyRound._id}`)
          .send({ dayOfWeek: 'monday' })
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(pulseSurveyRound._id.toString());
        expect(res.body.dayOfWeek).to.be.eq('monday');
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

      it('should return list of survey campaigns', async () => {
        const res = await agent
          .put(`/api/v1/distribute/${surveyCampaign._id}/rounds/${pulseSurveyRound._id}`)
          .send({ dayOfWeek: 'monday' })
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(pulseSurveyRound._id.toString());
        expect(res.body.dayOfWeek).to.be.eq('monday');
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .put(`/api/v1/distribute/${surveyCampaign._id}/rounds/${pulseSurveyRound._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
