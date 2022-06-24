import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from '../../../../../../index';

// factories
import {
  companyFactory,
  surveyCampaignFactory, surveyFactory,
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

let campaignIds;
let survey;

async function makeTestData() {
  const company = await companyFactory({});
  const team = await teamFactory({ company });

  // create survey
  survey = await surveyFactory({ company, team });
  survey = survey._id.toString();

  // create survey campaigns
  const [
    campaign1,
    campaign2,
    campaign3,
  ] = await Promise.all([
    surveyCampaignFactory({ company, team, survey }),
    surveyCampaignFactory({ company, team, survey }),
    surveyCampaignFactory({ company, team, survey }),
    // not match
    surveyCampaignFactory({ company })
  ]);

  campaignIds = [
    campaign1._id.toString(),
    campaign2._id.toString(),
    campaign3._id.toString(),
  ];

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
          .get('/api/v1/distribute')
          .query({ survey })
          .expect(httpStatus.OK);

        expect(res.body.resources.length).to.be.eq(3);
        expect(res.body.total).to.be.eq(3);

        const resourcesIds = res.body.resources.map(r => r._id.toString());

        expect(resourcesIds.every(r => campaignIds.includes(r))).to.be.eq(true);
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
          .get('/api/v1/distribute')
          .query({ survey })
          .expect(httpStatus.OK);

        expect(res.body.resources.length).to.be.eq(3);
        expect(res.body.total).to.be.eq(3);

        const resourcesIds = res.body.resources.map(r => r._id.toString());

        expect(resourcesIds.every(r => campaignIds.includes(r))).to.be.eq(true);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get('/api/v1/distribute')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
