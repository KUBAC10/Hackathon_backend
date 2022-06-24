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
  teamUserFactory,
  tagFactory,
  assetFactory
} from 'server/tests/factories';

// attributes
import { attributes as teamAttributes } from 'server/tests/factories/team.factory';
import { attributes as contactAttributes } from 'server/tests/factories/contact.factory';
import { attributes as userAttributes } from 'server/tests/factories/user.factory';
import { attributes as tagAttributes } from 'server/tests/factories/tag.factory';
import { attributes as assetAttributes } from 'server/tests/factories/asset.factory';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'team@email.com';
const entities = [
  { name: 'teams', model: 'Team', access: false, scope: [] },
  { name: 'contacts', model: 'Contact', access: true, scope: ['team'] },
  { name: 'users', model: 'User', access: false, scope: [] },
  { name: 'tags', model: 'Tag', access: true, scope: ['team'] },
  { name: 'assets', model: 'Asset', access: true, scope: ['team'] },
];
const ids = {};
const attributes = {};

let team1;
let team2;
let company1;
let company2;
let teamUser;

async function makeTestData() {
  // create companies
  [
    company1,
    company2
  ] = await Promise.all([
    companyFactory({}),
    companyFactory({})
  ]);

  // create teams
  [
    team1,
    team2,
  ] = await Promise.all([
    teamFactory({ company: company1 }),
    teamFactory({ company: company1 }),
  ]);

  // create Team user
  teamUser = await userFactory({ email, password, company: company1, currentTeam: team1 });
  await teamUserFactory({ company: company1, user: teamUser, team: team1 });

  // create entities in different company scopes
  for (const company of [company1, company2]) {
    ids[company._id] = {};
    // create data
    const data = await Promise.all([
      teamFactory({ company }),
      contactFactory({ company }),
      userFactory({ company }),
      tagFactory({ company }),
      assetFactory({ company }),
    ]);

    // set IDs
    entities.forEach((e, index) => (ids[company._id][e.name] = data[index]._id.toString()));
  }

  // create in company1 scope but in different teams
  for (const team of [team1, team2]) {
    ids[team._id] = {};
    const data = await Promise.all([
      contactFactory({ team, createdBy: teamUser }), // in contacts company set automatically
      tagFactory({ team, createdBy: teamUser }),
      assetFactory({ team, createdBy: teamUser })
    ]);

    // set IDs
    entities
      .filter(i => i.scope.includes('team'))
      .forEach((e, index) => (ids[team._id][e.name] = data[index]._id.toString()));
  }

  // set attributes for update
  const attributesObj = await Promise.all([
    teamAttributes({}, true, ['company']),
    contactAttributes({}, true, ['team', 'company']),
    userAttributes({}, true, ['company']),
    tagAttributes({}, true, ['team', 'company']),
    assetAttributes({}, true, ['team', 'company'])
  ]);

  entities.forEach((e, index) => (attributes[e.name] = attributesObj[index]));
}

describe('## PUT /api/v1/:list/:id', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized by Team User', () => {
    const agent = request.agent(app);
    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          password,
          login: email
        });
    });

    describe('Company scope', () => {
      entities.filter(i => i.access && !i.scope.length).forEach((item) => {
        it(`should update entity from list ${item.name} by id`, async () => {
          const id = ids[company1._id][item.name];
          const attr = attributes[item.name];
          const res = await agent
            .put(`/api/v1/${item.name}/${id}`)
            .send({
              ...attr
            })
            .expect(httpStatus.OK);
          expect(res.body.name).to.be.deep.equal(attributes[item.name].name);
          expect(res.body).to.be.an('object');
        });

        it(`should reject not found for entity from list ${item.name} by id from another company`, async () => {
          const id = ids[company2._id][item.name];
          const attr = attributes[item.name];
          await agent
            .put(`/api/v1/${item.name}/${id}`)
            .send({
              ...attr
            })
            .expect(httpStatus.NOT_FOUND);
        });
      });
    });

    describe('Team scope', () => {
      entities.filter(i => i.access && i.scope.includes('team')).forEach((item) => {
        it(`should update entity from list ${item.name} by id`, async () => {
          const id = ids[team1._id][item.name];
          const attr = attributes[item.name];
          const res = await agent
            .put(`/api/v1/${item.name}/${id}`)
            .send({
              ...attr
            })
            .expect(httpStatus.OK);
          expect(res.body.name).to.be.deep.equal(attributes[item.name].name);
          expect(res.body).to.be.an('object');
        });

        it(`should return forbidden for entity from list ${item.name} by id from another team`, async () => {
          const id = ids[team2._id][item.name];
          const attr = attributes[item.name];
          await agent
            .put(`/api/v1/${item.name}/${id}`)
            .send({
              ...attr
            })
            .expect(httpStatus.FORBIDDEN);
        });

        it(`should return not found for entity from list ${item.name}`, async () => {
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

    describe('When access denied', () => {
      entities.filter(i => !i.access).forEach((item) => {
        it(`should reject update  with forbidden status from list ${item.name} by id`, async () => {
          const id = ids[item.name];
          const attr = attributes[item.name];
          await agent
            .put(`/api/v1/${item.name}/${id}`)
            .send({
              ...attr
            })
            .expect(httpStatus.FORBIDDEN);
        });
      });
    });
  });
});
