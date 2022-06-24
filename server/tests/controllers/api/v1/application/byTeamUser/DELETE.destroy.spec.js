import request from 'supertest';
import httpStatus from 'http-status';
import chai from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  userFactory,
  teamFactory,
  companyFactory,
  teamUserFactory,
  contactFactory,
  tagFactory,
  tagEntityFactory,
  assetFactory,
} from 'server/tests/factories';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'team@email.com';
const entities = [
  { name: 'contacts', model: 'Contact', access: true, scope: ['team'] },
  { name: 'tags', model: 'Tag', access: true, scope: ['team'] },
  { name: 'tag-entities', model: 'TagEntity', access: true, scope: [] },
  { name: 'assets', model: 'Asset', access: true, scope: ['team'] }
];

const ids = {};
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
      contactFactory({ company, createdBy: teamUser }),
      tagFactory({ company, createdBy: teamUser }),
      tagEntityFactory({ company, createdBy: teamUser }),
      assetFactory({ company, createdBy: teamUser })
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
      assetFactory({ team, createdBy: teamUser }),
    ]);

    // set IDs
    entities
      .filter(i => i.scope.includes('team'))
      .forEach((e, index) => (ids[team._id][e.name] = data[index]._id.toString()));
  }
}

describe('# DELETE /api/v1/:list/:id', () => {
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
        it(`should remove entity from list ${item.name} by id`, async () => {
          const id = ids[company1._id][item.name];
          await agent
            .delete(`/api/v1/${item.name}/${id}`)
            .expect(httpStatus.NO_CONTENT);
        });

        it(`should return forbidden for entity from list ${item.name} by id from another company`, async () => {
          const id = ids[company2._id][item.name];
          await agent
            .delete(`/api/v1/${item.name}/${id}`)
            .expect(httpStatus.FORBIDDEN);
        });
      });
    });

    describe('Team scope', () => {
      entities.filter(i => i.access && i.scope.includes('team')).forEach((item) => {
        it(`should remove entity from list ${item.name} by id`, async () => {
          const id = ids[team1._id][item.name];
          await agent
            .delete(`/api/v1/${item.name}/${id}`)
            .expect(httpStatus.NO_CONTENT);
        });

        it(`should return forbidden for entity from list ${item.name} by id from another team`, async () => {
          const id = ids[team2._id][item.name];
          await agent
            .delete(`/api/v1/${item.name}/${id}`)
            .expect(httpStatus.FORBIDDEN);
        });

        it(`should reject not found for entity from list ${item.name} by id which associated with another company`, async () => {
          await agent
            .delete(`/api/v1/${item.name}/${team1._id}`)
            .expect(httpStatus.NOT_FOUND);
        });
      });
    });

    describe('When access denied', () => {
      entities.filter(i => !i.access).forEach((item) => {
        it(`should reject with forbidden status for ${item.name} by id`, async () => {
          const id = ids[company1._id][item.name];
          await agent
            .delete(`/api/v1/${item.name}/${id}`)
            .expect(httpStatus.FORBIDDEN);
        });
      });
    });
  });
});
