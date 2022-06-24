import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from '../../../../../../index';

// factories
import {
  companyFactory,
  mailerFactory,
  surveyCampaignFactory,
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

let campaign;
let invitationMailer;
let completionMailer;

async function makeTestData() {
  const company = await companyFactory({});
  const team = await teamFactory({ company });

  // create mailers
  [
    invitationMailer,
    completionMailer
  ] = await Promise.all([
    mailerFactory({ company, team }),
    mailerFactory({ company, team }),
  ]);

  // create survey campaign
  campaign = await surveyCampaignFactory({
    company,
    team,
    invitationMailer,
    completionMailer
  });

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

describe('# POST /api/v1/distribute/:id', () => {
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

      it('should return clone of survey campaign', async () => {
        const res = await agent
          .post(`/api/v1/distribute/${campaign._id}`)
          .expect(httpStatus.CREATED);

        expect(res.body._id.toString()).to.not.eq(campaign._id.toString());
        expect(res.body.invitationMailer._id.toString()).to.not.eq(invitationMailer._id.toString());
        expect(res.body.completionMailer._id.toString()).to.not.eq(completionMailer._id.toString());
      });

      it('should reject not found', async () => {
        await agent
          .post(`/api/v1/distribute/${invitationMailer._id}`)
          .expect(httpStatus.NOT_FOUND);
      });

      it('should reject by scopes', async () => {
        const campaign = await surveyCampaignFactory({ invitationMailer, completionMailer });

        await agent
          .post(`/api/v1/distribute/${campaign._id}`)
          .expect(httpStatus.FORBIDDEN);
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

      it('should return clone of survey campaign', async () => {
        const res = await agent
          .post(`/api/v1/distribute/${campaign._id}`)
          .expect(httpStatus.CREATED);

        expect(res.body._id.toString()).to.not.eq(campaign._id.toString());
        expect(res.body.invitationMailer._id.toString()).to.not.eq(invitationMailer._id.toString());
        expect(res.body.completionMailer._id.toString()).to.not.eq(completionMailer._id.toString());
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post(`/api/v1/distribute/${campaign._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
