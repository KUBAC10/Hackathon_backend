import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';
// helpers
import cleanData from 'server/tests/testHelpers/cleanData';
// factories
import {
  companyFactory,
  contactFactory,
  tagFactory,
  userFactory,
  tagEntityFactory
} from 'server/tests/factories';
import _ from 'lodash';

chai.config.includeStack = true;

let tag;
let contacts;
let company;
const password = '123123';
const email = 'asd@example.com';

async function makeTestData() {
  company = await companyFactory({});

  // create power user
  await userFactory({ password, email, company, isPowerUser: true });

  // create tag
  tag = await tagFactory({ company });
}

describe('## POST /api/v1/tags/:id/add-contacts', () => {
  before(cleanData);

  before(makeTestData);

  beforeEach(async () => {
    contacts = await Promise.all(_.flatMap(_.times(2), () => [
      contactFactory({ company }),
    ]));
  });

  describe('Authorized', () => {
    const agent = request.agent(app);
    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          login: email,
          password
        });
    });

    it('should response success', async () => {
      await agent
        .post(`/api/v1/tags/${tag._id}/add-contacts`)
        .send({
          contacts: contacts.map(i => i._id)
        })
        .expect(httpStatus.OK);
    });

    it('should response correct tagEntities amount', async () => {
      const res = await agent
        .post(`/api/v1/tags/${tag._id}/add-contacts`)
        .send({
          contacts: contacts.map(i => i._id)
        })
        .expect(httpStatus.OK);

      expect(res.body.length).to.be.eq(contacts.length);
    });

    it('should not add not valid contacts', async () => {
      const res = await agent
        .post(`/api/v1/tags/${tag._id}/add-contacts`)
        .send({
          contacts: [company._id]
        })
        .expect(httpStatus.OK);

      expect(res.body.length).to.be.eq(0);
    });

    it('should not add already exist tagEntity', async () => {
      await tagEntityFactory({ company, tag, contact: contacts[0] });
      const res = await agent
        .post(`/api/v1/tags/${tag._id}/add-contacts`)
        .send({
          contacts: [contacts[0]._id]
        })
        .expect(httpStatus.OK);

      expect(res.body.length).to.be.eq(0);
    });
  });

  describe('Unauthorized', () => {
    it('should reject unauthorized', async () => {
      await request(app)
        .post(`/api/v1/tags/${tag._id}/add-contacts`)
        .send({
          contacts: contacts.map(i => i._id)
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
