import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from '../../../../../../index';

// factories
import {
  companyFactory,
  surveyCampaignFactory,
  teamFactory,
  teamUserFactory,
  userFactory
} from '../../../../factories';

// models
import { SurveyCampaign } from '../../../../../models';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'test@email.com';
const email2 = 'test2@email.com';

let team;
let company;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const user = await userFactory({ email: email2, password, company, currentTeam: team });

  await teamUserFactory({ user, team, company });
}

describe('# DELETE /api/v1/distribute/:id', () => {
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

      it('should delete survey campaign', async () => {
        // create survey campaign
        const campaign = await surveyCampaignFactory({ company, team });

        await agent
          .delete(`/api/v1/distribute/${campaign._id}`)
          .expect(httpStatus.NO_CONTENT);

        const reload = await SurveyCampaign.model.findById(campaign._id);

        expect(reload).to.be.eq(null);
      });

      it('should reject not found', async () => {
        await agent
          .delete(`/api/v1/distribute/${company._id}`)
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

      it('should delete survey campaign', async () => {
        // create survey campaign
        const campaign = await surveyCampaignFactory({ company, team });

        await agent
          .delete(`/api/v1/distribute/${campaign._id}`)
          .expect(httpStatus.NO_CONTENT);

        const reload = await SurveyCampaign.model.findById(campaign._id);

        expect(reload).to.be.eq(null);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      // create survey campaign
      const campaign = await surveyCampaignFactory({ company, team });

      await request(app)
        .delete(`/api/v1/distribute/${campaign._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
