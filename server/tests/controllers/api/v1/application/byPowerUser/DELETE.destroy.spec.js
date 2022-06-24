import request from 'supertest';
import httpStatus from 'http-status';
import chai from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  userFactory,
  companyFactory,
  contactFactory,
  tagFactory,
  tagEntityFactory,
  assetFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'power@email.com';
const entities = [
  { name: 'contacts', model: 'Contact' },
  { name: 'tags', model: 'Tag' },
  { name: 'tag-entities', model: 'TagEntity' },
  { name: 'assets', model: 'Asset' }
];

const ids = {};
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
      contactFactory({ company, createdBy: powerUser }),
      tagFactory({ company, createdBy: powerUser }),
      tagEntityFactory({ company, createdBy: powerUser }),
      assetFactory({ company, createdBy: powerUser })
    ]);

    // set IDs
    entities.forEach((e, index) => (ids[company._id][e.name] = data[index]._id.toString()));
  }
}

describe('# DELETE /api/v1/:list/:id', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized By Power User', () => {
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
      it(`should remove entity from list ${item.name} by id`, async () => {
        const id = ids[company1._id][item.name];
        await agent
          .delete(`/api/v1/${item.name}/${id}`)
          .expect(httpStatus.NO_CONTENT);
      });

      it(`should return forbidden for entity from list ${item.name} by id which associated with another company`, async () => {
        const id = ids[company2._id][item.name];
        await agent
          .delete(`/api/v1/${item.name}/${id}`)
          .expect(httpStatus.FORBIDDEN);
      });

      it(`should reject not found for entity from list ${item.name} by id which associated with another company`, async () => {
        await agent
          .delete(`/api/v1/${item.name}/${company1._id}`)
          .expect(httpStatus.NOT_FOUND);
      });
    });
  });

  describe('Unauthorized', () => {
    entities.forEach((item) => {
      it(`should reject with unauthorized status for ${item.name}`, async () => {
        const id = ids[item.name];
        await request(app)
          .delete(`/api/v1/${item.name}/${id}`)
          .expect(httpStatus.UNAUTHORIZED);
      });
    });
  });
});
