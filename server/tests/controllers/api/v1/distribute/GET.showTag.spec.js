import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from '../../../../../../index';

// factories
import {
  companyFactory,
  contactFactory,
  tagEntityFactory,
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
let tag;

async function makeTestData() {
  company = await companyFactory({});
  const team = await teamFactory({ company });

  // create contacts
  const [
    contact1,
    contact2,
    contact3,
  ] = await Promise.all([
    contactFactory({ company, team }),
    contactFactory({ company, team }),
    contactFactory({ company, team })
  ]);

  // create survey campaign
  tag = await tagFactory({ company, team });

  // create tag entities
  await Promise.all([
    tagEntityFactory({ tag, company, contact: contact1 }),
    tagEntityFactory({ tag, company, contact: contact2 }),
    tagEntityFactory({ tag, company, contact: contact3 }),
    tagEntityFactory({ tag, company, contact: tag })
  ]);

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const user = await userFactory({ email: email2, password, company, currentTeam: team });

  await teamUserFactory({ user, team, company });
}

describe('# GET /api/v1/distribute/tag/:id', () => {
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

      it('should return tag contacts', async () => {
        const res = await agent
          .get(`/api/v1/distribute/tag/${tag._id}`)
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(tag._id.toString());
        expect(res.body.tagEntities.length).to.be.eq(3);
        expect(res.body.tagEntities.every(e => !!e.contact)).to.be.eq(true);
      });

      it('should reject not found status', async () => {
        await agent
          .get(`/api/v1/distribute/tag/${company._id}`)
          .expect(httpStatus.NOT_FOUND);
      });

      it('should reject by scopes', async () => {
        const tag = await tagFactory({});

        await agent
          .get(`/api/v1/distribute/tag/${tag._id}`)
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

      it('should return tag contacts', async () => {
        const res = await agent
          .get(`/api/v1/distribute/tag/${tag._id}`)
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(tag._id.toString());
        expect(res.body.tagEntities.length).to.be.eq(3);
        expect(res.body.tagEntities.every(e => !!e.contact)).to.be.eq(true);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get(`/api/v1/distribute/tag/${tag._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
