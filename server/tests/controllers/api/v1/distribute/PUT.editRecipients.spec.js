import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from '../../../../../../index';

// factories
import {
  companyFactory,
  surveyCampaignFactory,
  surveyFactory,
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

let surveyCampaign;
let survey;
let company;
let team;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create survey
  survey = await surveyFactory({ company, team });

  // create surveyCampaign
  surveyCampaign = await surveyCampaignFactory({ company, survey });

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const user = await userFactory({ email: email2, password, company, currentTeam: team });

  await teamUserFactory({ user, team, company });
}

describe('# POST /api/v1/distribute/recipients/:id', () => {
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

      it('should return validation error on add', async () => {
        const res = await agent
          .put(`/api/v1/distribute/recipients/${surveyCampaign._id}`)
          .send({
            entities: 'emails',
            action: 'add'
          })
          .expect(httpStatus.BAD_REQUEST);

        expect(res.body.message.value).to.be.eq('Is required');
      });

      it('should return validation error on remove', async () => {
        const res = await agent
          .put(`/api/v1/distribute/recipients/${surveyCampaign._id}`)
          .send({
            entities: 'contacts',
            action: 'remove'
          })
          .expect(httpStatus.BAD_REQUEST);

        expect(res.body.message.value).to.be.eq('Is required');
      });

      it('should add email', async () => {
        const res = await agent
          .put(`/api/v1/distribute/recipients/${surveyCampaign._id}`)
          .send({
            entities: 'emails',
            action: 'add',
            value: 'qwe@qwe.qwe'
          })
          .expect(httpStatus.OK);

        expect(res.body.emails.length).to.be.eq(1);
        expect(res.body.emails[0]).to.be.eq('qwe@qwe.qwe');
      });

      it('should add tag', async () => {
        const tag = await tagFactory({ company, team });

        const res = await agent
          .put(`/api/v1/distribute/recipients/${surveyCampaign._id}`)
          .send({
            entities: 'tags',
            action: 'add',
            value: tag._id.toString()
          })
          .expect(httpStatus.OK);

        expect(res.body.tags.length).to.be.eq(1);
        expect(res.body.tags[0]._id.toString()).to.be.eq(tag._id.toString());
      });

      it('should remove tag', async () => {
        const tag = await tagFactory({ company, team });

        surveyCampaign = await surveyCampaignFactory({ company, survey, tags: [tag] });

        const res = await agent
          .put(`/api/v1/distribute/recipients/${surveyCampaign._id}`)
          .send({
            entities: 'tags',
            action: 'remove',
            value: tag._id.toString()
          })
          .expect(httpStatus.OK);

        expect(res.body.tags.length).to.be.eq(0);
      });
    });

    // describe('As Team User', () => {
    //   const agent = request.agent(app);
    //   before(async () => {
    //     await agent
    //       .post('/api/v1/authentication')
    //       .send({
    //         login: email2,
    //         password
    //       });
    //   });
    //
    // });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .put(`/api/v1/distribute/recipients/${surveyCampaign._id}`)
        .send({
          entities: 'emails',
          action: 'add',
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
