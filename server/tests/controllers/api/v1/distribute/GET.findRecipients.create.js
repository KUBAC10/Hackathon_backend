import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from '../../../../../../index';

// factories
import {
  companyFactory,
  contactFactory, surveyCampaignFactory,
  tagFactory,
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

let company;
let contact;
let tag;
let campaign;

async function makeTestData() {
  company = await companyFactory({});
  const team = await teamFactory({ company });

  campaign = await surveyCampaignFactory({ company, team });

  // create tags and contacts (recipients)
  [
    contact,
    tag
  ] = await Promise.all([
    contactFactory({
      company,
      team,
      firstName: 'FirstName',
      lastName: 'LastName',
      email: 'example@email.com',
      phoneNumber: '380'
    }),
    tagFactory({
      company,
      team,
      name: 'TagName',
      description: 'TagDescription'
    }),
    // should not match
    contactFactory({ company, team }),
    tagFactory({ company, team }),
  ]);

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const user = await userFactory({ email: email2, password, company, currentTeam: team });

  await teamUserFactory({ user, team, company });
}

describe('# GET /api/v1/distribute/recipients/:id', () => {
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

      it('should find contact by first name', async () => {
        const res = await agent
          .get(`/api/v1/distribute/recipients/${campaign._id}`)
          .query({ value: 'FirstName' })
          .expect(httpStatus.OK);

        expect(res.body.length).to.be.eq(1);
        expect(res.body[0]._id.toString()).to.be.eq(contact._id.toString());
      });

      it('should find contact by last name', async () => {
        const res = await agent
          .get(`/api/v1/distribute/recipients/${campaign._id}`)
          .query({ value: 'last' })
          .expect(httpStatus.OK);

        expect(res.body.length).to.be.eq(1);
        expect(res.body[0]._id.toString()).to.be.eq(contact._id.toString());
      });

      it('should find contact by email', async () => {
        const res = await agent
          .get(`/api/v1/distribute/recipients/${campaign._id}`)
          .query({ value: 'example@email.com' })
          .expect(httpStatus.OK);

        expect(res.body.length).to.be.eq(1);
        expect(res.body[0]._id.toString()).to.be.eq(contact._id.toString());
      });

      it('should find contact by phone number', async () => {
        const res = await agent
          .get(`/api/v1/distribute/recipients/${campaign._id}`)
          .query({ value: '+380' })
          .expect(httpStatus.OK);

        expect(res.body.length).to.be.eq(1);
        expect(res.body[0]._id.toString()).to.be.eq(contact._id.toString());
      });

      it('should return tag by name', async () => {
        const res = await agent
          .get(`/api/v1/distribute/recipients/${campaign._id}`)
          .query({ value: '#TagName' })
          .expect(httpStatus.OK);

        expect(res.body.length).to.be.eq(1);
        expect(res.body[0]._id.toString()).to.be.eq(tag._id.toString());
      });

      it('should return tag by description', async () => {
        const res = await agent
          .get(`/api/v1/distribute/recipients/${campaign._id}`)
          .query({ value: 'description' })
          .expect(httpStatus.OK);

        expect(res.body.length).to.be.eq(1);
        expect(res.body[0]._id.toString()).to.be.eq(tag._id.toString());
      });

      it('should reject not found status', async () => {
        await agent
          .get(`/api/v1/distribute/recipients/${company._id}`)
          .query({ value: 'xxx' })
          .expect(httpStatus.NOT_FOUND);
      });

      it('should reject by scopes', async () => {
        const campaign = await surveyCampaignFactory({});

        await agent
          .get(`/api/v1/distribute/recipients/${campaign._id}`)
          .query({ value: 'xxx' })
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

      it('should find contact by first name', async () => {
        const res = await agent
          .get(`/api/v1/distribute/recipients/${campaign._id}`)
          .query({ value: 'FirstName' })
          .expect(httpStatus.OK);

        expect(res.body.length).to.be.eq(1);
        expect(res.body[0]._id.toString()).to.be.eq(contact._id.toString());
      });

      it('should find contact by last name', async () => {
        const res = await agent
          .get(`/api/v1/distribute/recipients/${campaign._id}`)
          .query({ value: 'last' })
          .expect(httpStatus.OK);

        expect(res.body.length).to.be.eq(1);
        expect(res.body[0]._id.toString()).to.be.eq(contact._id.toString());
      });

      it('should find contact by email', async () => {
        const res = await agent
          .get(`/api/v1/distribute/recipients/${campaign._id}`)
          .query({ value: 'example@email.com' })
          .expect(httpStatus.OK);

        expect(res.body.length).to.be.eq(1);
        expect(res.body[0]._id.toString()).to.be.eq(contact._id.toString());
      });

      it('should return tag by name', async () => {
        const res = await agent
          .get(`/api/v1/distribute/recipients/${campaign._id}`)
          .query({ value: 'TagName' })
          .expect(httpStatus.OK);

        expect(res.body.length).to.be.eq(1);
        expect(res.body[0]._id.toString()).to.be.eq(tag._id.toString());
      });

      it('should return tag by description', async () => {
        const res = await agent
          .get(`/api/v1/distribute/recipients/${campaign._id}`)
          .query({ value: 'description' })
          .expect(httpStatus.OK);

        expect(res.body.length).to.be.eq(1);
        expect(res.body[0]._id.toString()).to.be.eq(tag._id.toString());
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get(`/api/v1/distribute/recipients/${campaign._id}`)
        .query({ value: 'value' })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
