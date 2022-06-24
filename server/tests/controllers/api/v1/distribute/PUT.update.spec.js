import moment from 'moment';
import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from '../../../../../../index';

// factories
import {
  companyFactory,
  teamFactory,
  teamUserFactory,
  userFactory,
  surveyCampaignFactory,
  contactFactory,
  tagEntityFactory
} from '../../../../factories';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'test@email.com';
const email2 = 'test2@email.com';

let company;
let team;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const user = await userFactory({ email: email2, password, company, currentTeam: team });

  await teamUserFactory({ user, team, company });
}

describe('# PUT /api/v1/distribute', () => {
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

      it('should update survey campaign', async () => {
        const startDate = new Date().toISOString();
        const endDate = new Date().toISOString();
        const campaign = await surveyCampaignFactory({ company, team });

        const { body } = await agent
          .put(`/api/v1/distribute/${campaign._id}`)
          .send({
            name: 'New Name',
            status: 'active',
            frequency: 'weekly',
            sendCompletionMailer: true,
            startDate,
            endDate
          })
          .expect(httpStatus.OK);

        expect(body.name).to.be.eq('New Name');
        expect(body.status).to.be.eq('active');
        expect(body.frequency).to.be.eq('weekly');
        expect(body.sendCompletionMailer).to.be.eq(true);
        expect(body.startDate).to.be.eq(startDate);
        expect(body.endDate).to.be.eq(endDate);
      });

      it('should create correct invitesData', async () => {
        const emails = [
          'qwe1@qwe.qwe',
          'qwe2@qwe.qwe',
          'qwe3@qwe.qwe'
        ];

        const contacts = await Promise.all([
          contactFactory({ company, team, email: emails[0] }),
          // uniq contacts
          contactFactory({ company, team }),
          contactFactory({ company, team }),
        ]);

        const tagEntities = await Promise.all([
          tagEntityFactory({ company, contact: contacts[0] }),
          // uniq tagEntities
          tagEntityFactory({ company }),
          tagEntityFactory({ company }),
        ]);

        const tags = tagEntities.map(({ tag }) => tag);

        const surveyCampaign = await surveyCampaignFactory({ company, emails, contacts, tags, fireTime: moment().add(1, 'week') });

        const res = await agent
          .put(`/api/v1/distribute/${surveyCampaign._id}`)
          .send({ status: 'active' })
          .expect(httpStatus.OK);

        const { invitesData } = res.body;

        const invitesDataEmails = invitesData.map(({ email }) => email);
        const invitesDataContacts = invitesData.filter(i => i._id).map(({ _id }) => _id.toString());

        expect(invitesData.length).to.be.eq(7);
        expect(emails.every(e => invitesDataEmails.includes(e))).to.be.eq(true);
        expect(invitesDataContacts.includes(contacts[0]._id.toString())).to.be.eq(true);
      });

      it('should reject not found', async () => {
        await agent
          .put(`/api/v1/distribute/${company._id}`)
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

      it('should update survey campaign', async () => {
        const startDate = new Date().toISOString();
        const endDate = new Date().toISOString();
        const campaign = await surveyCampaignFactory({ company, team });

        const { body } = await agent
          .put(`/api/v1/distribute/${campaign._id}`)
          .send({
            name: 'New Name',
            status: 'active',
            frequency: 'weekly',
            sendCompletionMailer: true,
            startDate,
            endDate
          })
          .expect(httpStatus.OK);

        expect(body.name).to.be.eq('New Name');
        expect(body.status).to.be.eq('active');
        expect(body.frequency).to.be.eq('weekly');
        expect(body.sendCompletionMailer).to.be.eq(true);
        expect(body.startDate).to.be.eq(startDate);
        expect(body.endDate).to.be.eq(endDate);
      });

      it('should create correct invitesData', async () => {
        const emails = [
          'asd1@asd.asd',
          'asd2@asd.asd',
          'asd3@asd.asd'
        ];

        const contacts = await Promise.all([
          contactFactory({ company, team, email: emails[0] }),
          // uniq contacts
          contactFactory({ company, team }),
          contactFactory({ company, team }),
        ]);

        const tagEntities = await Promise.all([
          tagEntityFactory({ company, contact: contacts[0] }),
          // uniq tagEntities
          tagEntityFactory({ company }),
          tagEntityFactory({ company }),
        ]);

        const tags = tagEntities.map(({ tag }) => tag);

        const surveyCampaign = await surveyCampaignFactory({ company, team, emails, contacts, tags, fireTime: moment().add(1, 'week') });

        const res = await agent
          .put(`/api/v1/distribute/${surveyCampaign._id}`)
          .send({ status: 'active' })
          .expect(httpStatus.OK);

        const { invitesData } = res.body;

        const invitesDataEmails = invitesData.map(({ email }) => email);
        const invitesDataContacts = invitesData.filter(i => i._id).map(({ _id }) => _id.toString());

        expect(invitesData.length).to.be.eq(7);
        expect(emails.every(e => invitesDataEmails.includes(e))).to.be.eq(true);
        expect(invitesDataContacts.includes(contacts[0]._id.toString())).to.be.eq(true);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .put(`/api/v1/distribute/${company._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
