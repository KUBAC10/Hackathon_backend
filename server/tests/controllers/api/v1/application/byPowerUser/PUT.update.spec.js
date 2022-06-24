import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  userFactory,
  teamFactory,
  companyFactory,
  contactFactory,
  tagFactory,
  assetFactory,
} from 'server/tests/factories';

// attributes
import { attributes as teamAttributes } from 'server/tests/factories/team.factory';
import { attributes as contactAttributes } from 'server/tests/factories/contact.factory';
import { attributes as tagAttributes } from 'server/tests/factories/tag.factory';
import { attributes as assetAttributes } from 'server/tests/factories/asset.factory';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'power@email.com';
const entities = [
  { name: 'teams', model: 'Team' },
  { name: 'contacts', model: 'Contact' },
  { name: 'tags', model: 'Tag' },
  { name: 'assets', model: 'Asset' },
];
const ids = {};
const attributes = {};

let company1;
let company2;

async function makeTestData() {
  // create companies
  [
    company1,
    company2
  ] = await Promise.all([
    companyFactory({}),
    companyFactory({})
  ]);

  // create Power user
  const powerUser = await userFactory({ email, password, company: company1, isPowerUser: true });

  // create entities in different company scopes
  for (const company of [company1, company2]) {
    ids[company._id] = {};
    // create data
    const data = await Promise.all([
      teamFactory({ company, createdBy: powerUser }),
      contactFactory({ company, createdBy: powerUser }),
      tagFactory({ company, createdBy: powerUser }),
      assetFactory({ company, createdBy: powerUser }),
    ]);

    // set IDs
    entities.forEach((e, index) => (ids[company._id][e.name] = data[index]._id.toString()));
  }

  // set attributes for update
  const attributesObj = await Promise.all([
    teamAttributes({}, true, ['company']),
    contactAttributes({}, true, ['team', 'company']),
    tagAttributes({}, true, ['team', 'company']),
    assetAttributes({}, true, ['team', 'company']),
  ]);

  entities.forEach((e, index) => (attributes[e.name] = attributesObj[index]));
}

describe('## PUT /api/v1/:list/:id', () => {
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
      it(`should update entity from list ${item.name} by id`, async () => {
        const id = ids[company1._id][item.name];
        const attr = attributes[item.name];
        const res = await agent
          .put(`/api/v1/${item.name}/${id}`)
          .send({
            ...attr
          })
          .expect(httpStatus.OK);
        const field = Object.keys(attr).find(f => typeof attr[f] !== 'object' && f !== 'password');
        expect(res.body[field]).to.be.deep.equal(attributes[item.name][field]);
        expect(res.body).to.be.an('object');
      });

      it(`should forbidden for entity from list ${item.name} by id which associated with another company`, async () => {
        const id = ids[company2._id][item.name];
        const attr = attributes[item.name];
        await agent
          .put(`/api/v1/${item.name}/${id}`)
          .send({
            ...attr
          })
          .expect(httpStatus.FORBIDDEN);
      });

      it(`should not found for entity from list ${item.name}`, async () => {
        const attr = attributes[item.name];
        await agent
          .put(`/api/v1/${item.name}/${company1._id}`)
          .send({
            ...attr
          })
          .expect(httpStatus.NOT_FOUND);
      });
    });
  });

  describe('Unauthorized', () => {
    entities.forEach((item) => {
      it(`should reject with unauthorized status for ${item.name}`, async () => {
        const id = ids[item.name];
        const attr = attributes[item.name];
        await request(app)
          .put(`/api/v1/${item.name}/${id}`)
          .send({
            ...attr
          })
          .expect(httpStatus.UNAUTHORIZED);
      });
    });
  });
});
