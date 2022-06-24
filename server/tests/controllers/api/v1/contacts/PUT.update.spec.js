import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

import {
  userFactory,
  teamFactory,
  companyFactory,
  teamUserFactory,
  tagFactory, contactFactory, tagEntityFactory
} from '../../../../factories';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

chai.config.includeStack = true;

const password = 'password';
const email1 = 'test1@email.com';
const email2 = 'test2@email.com';

let company;
let team;

async function makeTestData() {
  // create company and team
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create Power user
  await userFactory({ email: email1, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('## PUT /api/v1/contacts', () => {
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

      it('should update contact and handle tag entities', async () => {
        const contact = await contactFactory({ team });

        const [
          tag1,
          tag2,
          tag3
        ] = await Promise.all([
          tagFactory({ company, team }),
          tagFactory({ company, team }),
          tagFactory({ company, team })
        ]);

        await Promise.all([
          tagEntityFactory({ company, contact, tag: tag1 }),
          tagEntityFactory({ company, contact, tag: tag2 })
        ]);

        const tags = [
          tag2._id.toString(),
          tag3._id.toString()
        ];

        const res = await agent
          .put(`/api/v1/contacts/${contact._id}`)
          .send({ tags })
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(contact._id.toString());

        const { tagEntities } = res.body;

        expect(tagEntities).to.be.an('array');
        expect(tagEntities.length).to.be.eq(2);

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

      it('should update contact and handle tag entities', async () => {
        const contact = await contactFactory({ team });

        const [
          tag1,
          tag2,
          tag3
        ] = await Promise.all([
          tagFactory({ company, team }),
          tagFactory({ company, team }),
          tagFactory({ company, team })
        ]);

        await Promise.all([
          tagEntityFactory({ company, contact, tag: tag1 }),
          tagEntityFactory({ company, contact, tag: tag2 })
        ]);

        const tags = [
          tag2._id.toString(),
          tag3._id.toString()
        ];

        const res = await agent
          .put(`/api/v1/contacts/${contact._id}`)
          .send({ tags })
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(contact._id.toString());

        const { tagEntities } = res.body;

        expect(tagEntities).to.be.an('array');
        expect(tagEntities.length).to.be.eq(2);

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
        .put(`/api/v1/contacts/${team._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
