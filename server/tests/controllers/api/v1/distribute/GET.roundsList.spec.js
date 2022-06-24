import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from '../../../../../../index';

// factories
import {
  companyFactory,
  pulseSurveyRecipientFactory,
  pulseSurveyRoundFactory,
  pulseSurveyRoundResultFactory,
  surveyCampaignFactory,
  surveyFactory,
  surveyResultFactory,
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

async function makeTestData() {
  const company = await companyFactory({});
  const team = await teamFactory({ company });

  // create survey
  survey = await surveyFactory({ company, team });

  surveyCampaign = await surveyCampaignFactory({ company, team, survey });

  const rounds = await Promise.all([
    pulseSurveyRoundFactory({ surveyCampaign, survey }),
    pulseSurveyRoundFactory({ surveyCampaign, survey }),
    pulseSurveyRoundFactory({ surveyCampaign, survey })
  ]);

  for (const round of rounds) {
    await Promise.all([
      surveyResultFactory({ company, team, survey, pulseSurveyRound: round, completed: true }),
      surveyResultFactory({ company, team, survey, pulseSurveyRound: round, completed: true }),
      pulseSurveyRoundResultFactory({ pulseSurveyRound: round._id, surveyCampaign }),
      pulseSurveyRoundResultFactory({ pulseSurveyRound: round._id, surveyCampaign })
    ]);
  }

  await Promise.all([
    pulseSurveyRecipientFactory({ surveyCampaign }),
    pulseSurveyRecipientFactory({ surveyCampaign }),
    pulseSurveyRecipientFactory({ surveyCampaign })
  ]);

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
          .get(`/api/v1/distribute/${surveyCampaign._id}/rounds`)
          .expect(httpStatus.OK);

        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.eq(3);

        res.body.forEach((item) => {
          expect(item.remindersCounter).to.be.eq(0);
          expect(item.responseRate).to.be.eq('100');
          expect(item.employees).to.be.eq(2);
        });
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
          .get(`/api/v1/distribute/${surveyCampaign._id}/rounds`)
          .expect(httpStatus.OK);

        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.eq(3);

        res.body.forEach((item) => {
          expect(item.remindersCounter).to.be.eq(0);
          expect(item.responseRate).to.be.eq('100');
          expect(item.employees).to.be.eq(2);
        });
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get(`/api/v1/distribute/${surveyCampaign._id}/rounds`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
