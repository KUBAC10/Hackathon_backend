import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  userFactory,
  tagFactory,
  contactFactory,
  tagEntityFactory,
  companyFactory,
} from 'server/tests/factories';

chai.config.includeStack = true;

let contact;
let tag1;
let tag2;
let tag3;
let company;
const password = '123123';
const email = 'asd@example.com';

async function makeTestData() {
  company = await companyFactory({});

  // create power user
  const powerUser = await userFactory({ password, email, company, isPowerUser: true });

  contact = await contactFactory({ createdBy: powerUser, company });
  [
    tag1,
    tag2,
    tag3
  ] = await Promise.all([
    tagFactory({}),
    tagFactory({}),
    tagFactory({})
  ]);
  await tagEntityFactory({ contact: contact._id, tag: tag1._id });
  await tagEntityFactory({ contact: contact._id, tag: tag2._id });
}

describe('## PUT /api/v1/manage-tags/:type/:id', () => {
  before(cleanData);

  before(makeTestData);

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

    it('should update tag entities', async () => {
      const tags = [tag2._id, tag3._id];

      const res = await agent
        .put(`/api/v1/manage-tags/contact/${contact._id}`)
        .send({
          items: tags
        })
        .expect(httpStatus.OK);

      const tagsIds = res.body.tagEntities.map(i => i.tag._id);

      expect(res.body.tagEntities.length).to.be.eq(2);
      expect(tagsIds[0]).to.be.eq(tag2._id.toString());
      expect(tagsIds[1]).to.be.eq(tag3._id.toString());
    });

    it('should return error if contacts does not exist', async () => {
      const tags = [tag2._id, tag3._id];

      await agent
        .put(`/api/v1/manage-tags/contact/${company._id}`)
        .send({
          items: tags
        })
        .expect(httpStatus.NOT_FOUND);
    });

    it('should reject by team scope', async () => {
      contact = await contactFactory({});

      const tags = [tag2._id, tag3._id];

      await agent
        .put(`/api/v1/manage-tags/contact/${contact._id}`)
        .send({
          items: tags
        })
        .expect(httpStatus.FORBIDDEN);
    });
  });

  describe('Unauthorized', () => {
    it('should reject unauthorized', async () => {
      await request(app).put(`/api/v1/manage-tags/contact/${contact._id}`).expect(httpStatus.UNAUTHORIZED);
    });
  });
});
