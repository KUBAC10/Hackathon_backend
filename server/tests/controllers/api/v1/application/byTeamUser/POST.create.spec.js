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
  teamFactory,
  companyFactory,
  teamUserFactory,
} from 'server/tests/factories';

// attributes
import { attributes as teamAttributes } from 'server/tests/factories/team.factory';
import { attributes as contactAttributes } from 'server/tests/factories/contact.factory';
import { attributes as userAttributes } from 'server/tests/factories/user.factory';
import { attributes as tagAttributes } from 'server/tests/factories/tag.factory';
import { attributes as tagEntityAttributes } from 'server/tests/factories/tagEntity.factory';
import { attributes as assetsAttributes } from 'server/tests/factories/asset.factory';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'team@email.com';
const entities = [
  { name: 'teams', model: 'Team', access: false },
  { name: 'contacts', model: 'Contact', access: true },
  { name: 'users', model: 'User', access: false },
  { name: 'tags', model: 'Tag', access: true },
  { name: 'tag-entities', model: 'TagEntity', access: true },
  { name: 'assets', model: 'Asset', access: true }
];
const attributes = {};

let team;
let company;
let teamUser;

async function makeTestData() {
  // create company
  company = await companyFactory({});

  // create team
  team = await teamFactory({ company });

  // create Team user
  teamUser = await userFactory({ email, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });

  // set attributes
  const attributesObj = await Promise.all([
    teamAttributes({}, true, ['company']),
    contactAttributes({}, true, ['team', 'company']),
    userAttributes({}, true, ['company']),
    tagAttributes({}, true, ['company', 'team']),
    tagEntityAttributes({}, true, ['company']),
    assetsAttributes({}, true, ['company'])
  ]);

  entities.forEach((e, index) => (attributes[e.name] = attributesObj[index]));
}

describe('## POST /api/v1/:list', () => {
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

    describe('When access allowed', () => {
      entities.filter(i => i.access).forEach((item) => {
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

    describe('When access denied', () => {
      entities.filter(i => !i.access).forEach((item) => {
        it(`should reject with forbidden status for ${item.name}`, async () => {
          const attr = attributes[item.name];
          await agent
            .post(`/api/v1/${item.name}`)
            .send({ ...attr })
            .expect(httpStatus.FORBIDDEN);
        });
      });
    });
  });
});
