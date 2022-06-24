import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import models from 'server/models';

// factories
import {
  userFactory,
  companyFactory,
} from 'server/tests/factories';

// attributes
import { attributes as teamAttributes } from 'server/tests/factories/team.factory';
import { attributes as contactAttributes } from 'server/tests/factories/contact.factory';
import { attributes as tagAttributes } from 'server/tests/factories/tag.factory';
import { attributes as tagEntityAttributes } from 'server/tests/factories/tagEntity.factory';
import { attributes as assetAttributes } from 'server/tests/factories/asset.factory';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'power@email.com';
const entities = [
  { name: 'teams', model: 'Team' },
  { name: 'contacts', model: 'Contact' },
  { name: 'tags', model: 'Tag' },
  { name: 'tag-entities', model: 'TagEntity' },
  { name: 'assets', model: 'Asset' }
];
const attributes = {};

let company;

async function makeTestData() {
  // create company
  company = await companyFactory({});

  // create Power user
  await userFactory({ email, password, company, isPowerUser: true });

  // set attributes
  const attributesObj = await Promise.all([
    teamAttributes({}, true, ['company']),
    contactAttributes({}, true, ['team', 'company']),
    tagAttributes({}, true, ['team', 'company']),
    tagEntityAttributes({}, true, ['company']),
    assetAttributes({}, true, ['company'])
  ]);

  entities.forEach((e, index) => (attributes[e.name] = attributesObj[index]));
}

describe('## POST /api/v1/:list', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized by Power User', () => {
    const agent = request.agent(app);
    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          password,
          login: email
        });
    });

    entities.forEach((item) => {
      it(`should create entity for ${item.name}`, async () => {
        const attr = attributes[item.name];
        const countBefore = await models[item.model].model.countDocuments();
        const res = await agent
          .post(`/api/v1/${item.name}`)
          .send({ ...attr })
          .expect(httpStatus.CREATED);
        const countAfter = await models[item.model].model.countDocuments();
        expect(res.body).to.be.an('object');
        expect(countAfter).to.be.eq(countBefore + 1);
      });
    });
  });

  describe('Unauthorized', () => {
    entities.forEach((item) => {
      it(`should reject with unauthorized status for ${item.name}`, async () => {
        const attr = attributes[item.name];
        await request(app)
          .post(`/api/v1/${item.name}`)
          .send({ ...attr })
          .expect(httpStatus.UNAUTHORIZED);
      });
    });
  });
});
