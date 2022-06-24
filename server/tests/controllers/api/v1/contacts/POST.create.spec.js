import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

import {
  userFactory,
  teamFactory,
  companyFactory,
  teamUserFactory,
  tagFactory
} from '../../../../factories';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

chai.config.includeStack = true;

const password = 'password';
const email1 = 'test1@email.com';
const email2 = 'test2@email.com';

let company;
let team;
let tags;

async function makeTestData() {
  // create company and team
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create tags
  tags = await Promise.all([
    tagFactory({ company, team }),
    tagFactory({ company, team }),
    tagFactory({ company, team })
  ]);

  tags = tags.map(t => t._id.toString());

  // create Power user
  await userFactory({ email: email1, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('## POST /api/v1/contacts - create contact', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('As Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email1,
            password
          });
      });

      it('should create contacts and tag entities', async () => {
        const res = await agent
          .post('/api/v1/contacts')
          .send({
            email: 'qwe1@qwe.qwe',
            tags
          })
          .expect(httpStatus.CREATED);

        expect(res.body.email).to.be.eq('qwe1@qwe.qwe');
        expect(res.body.team.toString()).to.be.eq(team._id.toString());

        const { tagEntities } = res.body;

        expect(tagEntities).to.be.an('array');
        expect(tagEntities.length).to.be.eq(tags.length);

        tagEntities.forEach((tagEntity) => {
          expect(tagEntity.contact.toString()).to.be.eq(res.body._id.toString());
          expect(tagEntity.company.toString()).to.be.eq(company._id.toString());
          expect(tags.includes(tagEntity.tag._id.toString())).to.be.eq(true);
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

      it('should create contacts and tag entities', async () => {
        const res = await agent
          .post('/api/v1/contacts')
          .send({
            email: 'qwe2@qwe.qwe',
            tags
          })
          .expect(httpStatus.CREATED);

        expect(res.body.email).to.be.eq('qwe2@qwe.qwe');
        expect(res.body.team.toString()).to.be.eq(team._id.toString());

        const { tagEntities } = res.body;

        expect(tagEntities).to.be.an('array');
        expect(tagEntities.length).to.be.eq(tags.length);

        tagEntities.forEach((tagEntity) => {
          expect(tagEntity.contact.toString()).to.be.eq(res.body._id.toString());
          expect(tagEntity.company.toString()).to.be.eq(company._id.toString());
          expect(tags.includes(tagEntity.tag._id.toString())).to.be.eq(true);
        });
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post('/api/v1/contacts')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
