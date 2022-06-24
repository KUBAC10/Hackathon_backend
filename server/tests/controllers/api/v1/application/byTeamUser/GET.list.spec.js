import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import _ from 'lodash';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import models from 'server/models';

// factories
import {
  teamFactory,
  userFactory,
  contactFactory,
  companyFactory,
  teamUserFactory,
  tagFactory,
  questionFactory,
  surveyFactory,
  assetFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'team@email.com';
const entities = [
  { name: 'contacts', model: 'Contact', access: true, scope: ['team'] },
  { name: 'users', model: 'User', access: false, scope: [] },
  { name: 'tags', model: 'Tag', access: true, scope: ['team'] },
  { name: 'questions', model: 'Question', access: true, scope: ['team'] },
  { name: 'surveys', model: 'Survey', access: true, scope: ['team'] },
  { name: 'assets', model: 'Asset', access: true, scope: ['team'] },
];

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
    teamFactory({ company: company1 })
  ]);

  // create company1-team1 team user
  teamUser = await userFactory({ email, password, company: company1, currentTeam: team1 });
  await teamUserFactory({ user: teamUser, team: team1, company: company1 });

  for (const company of [company1, company2]) {
    await Promise.all(_.flatMap(_.times(2), () => [
      teamFactory({ company }),
      userFactory({ company }),
    ]));
  }

  // create in company1 scope but in different teams
  for (const team of [team1, team2]) {
    await Promise.all(_.flatMap(_.times(2), () => [
      contactFactory({ team }),
      tagFactory({ team }),
      questionFactory({ team, trend: true }),
      surveyFactory({ team }),
      assetFactory({ team })
    ]));
  }
}

describe('## GET /api/v1/:list', () => {
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
        it(`should return list of entities for ${item.name}`, async () => {
          const query = { company: company1._id };
          const docs = await models[item.model].model
            .find(query).lean();
          const ids = docs.map(i => i._id.toString());
          const res = await agent
            .get(`/api/v1/${item.name}`)
            .query({
              limit: 100
            })
            .expect(httpStatus.OK);
          expect(res.body.resources.length).to.be.eq(docs.length);
          // check valid ids
          expect(res.body.resources.map(i => i._id.toString())).to.include.members(ids);
        });
      });
    });

    describe('Team scope', () => {
      entities.filter(i => i.access && i.scope.includes('team')).forEach((item) => {
        it(`should return list of entities for ${item.name}`, async () => {
          const query = { company: company1._id, team: team1._id };
          const docs = await models[item.model].model
            .find(query).lean();
          const ids = docs.map(i => i._id.toString());
          const res = await agent
            .get(`/api/v1/${item.name}`)
            .query({
              limit: 100
            })
            .expect(httpStatus.OK);
          expect(res.body.resources.length).to.be.eq(docs.length);
          // check valid ids
          expect(res.body.resources.map(i => i._id.toString())).to.include.members(ids);
        });
      });
    });

    describe('When access denied', () => {
      entities.filter(i => !i.access).forEach((item) => {
        it(`should reject with status forbidden for ${item.name}`, async () => {
          await models[item.model].model
            .find({ company: company1._id }).countDocuments();
          await agent
            .get(`/api/v1/${item.name}`)
            .query({
              limit: 100
            })
            .expect(httpStatus.FORBIDDEN);
        });
      });
    });
  });
});
