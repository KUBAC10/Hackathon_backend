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
  teamFactory,
  userFactory,
  contactFactory,
  companyFactory,
  tagFactory,
  questionFactory,
  surveyFactory,
  surveyResultFactory,
  assetFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

const email = 'power@email.com';
const password = 'qwe123qwe';

const entitiesCompany = [
  { name: 'users', model: 'User' },
  { name: 'survey-results', model: 'SurveyResult' },
  { name: 'assets', model: 'Asset' }
];

const entitiesTeam = [
  { name: 'contacts', model: 'Contact' },
  { name: 'tags', model: 'Tag' },
  { name: 'questions', model: 'Question' },
  { name: 'surveys', model: 'Survey' },
];

let company1;
let company2;
let team1;
let team2;
let powerUser;

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
    team2
  ] = await Promise.all([
    teamFactory({ company: company1 }),
    teamFactory({ company: company2 })
  ]);

  // create Power User of company1
  powerUser = await userFactory({
    email,
    password,
    company: company1,
    isPowerUser: true,
    currentTeam: team1
  });

  // create entities in different company scopes
  for (const company of [company1, company2]) {
    await Promise.all([
      teamFactory({ company }),
      userFactory({ company }),
      surveyResultFactory({ company, empty: false }),
      assetFactory({ company })
    ]);
  }

  // create entities in different team scopes
  for (const team of [team1, team2]) {
    await Promise.all([
      tagFactory({ company: company1, team }),
      contactFactory({ team }),
      questionFactory({ company: company1, trend: true, team }),
      surveyFactory({ company: company1, team }),
    ]);
  }
}

describe('## GET /api/v1/:list', () => {
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

    entitiesCompany.forEach((item) => {
      it(`should return list of all entities by company scope for ${item.name}`, async () => {
        const query = { company: company1._id };
        if (item.name === 'users') query._id = { $ne: powerUser._id };
        if (item.name === 'survey-results') query.empty = false;

        const docs = await models[item.model].model
          .find(query)
          .lean();

        const ids = docs.map(i => i._id.toString());

        const res = await agent
          .get(`/api/v1/${item.name}`)
          .query({
            limit: 100
          })
          .expect(httpStatus.OK);

        expect(res.body.resources.length).to.be.eq(1);
        // check valid ids
        expect(res.body.resources.map(i => i._id.toString())).to.include.members(ids);
      });
    });

    entitiesTeam.forEach((item) => {
      it(`should return list of all entities by team scope for ${item.name}`, async () => {
        const query = { team: team1._id };

        if (item.name === 'questions') query.trend = { $eq: true };

        const docs = await models[item.model].model
          .find(query)
          .lean();

        const ids = docs.map(i => i._id.toString());

        const res = await agent
          .get(`/api/v1/${item.name}`)
          .query({
            limit: 100
          })
          .expect(httpStatus.OK);

        expect(res.body.resources.length).to.be.eq(1);
        // check valid ids
        expect(res.body.resources.map(i => i._id.toString())).to.include.members(ids);
      });
    });
  });

  describe('Unauthorized', () => {
    entitiesCompany.forEach((item) => {
      it(`should reject with unauthorized status for ${item.name}`, async () => {
        await request(app)
          .get(`/api/v1/${item.name}`)
          .expect(httpStatus.UNAUTHORIZED);
      });
    });

    entitiesTeam.forEach((item) => {
      it(`should reject with unauthorized status for ${item.name}`, async () => {
        await request(app)
          .get(`/api/v1/${item.name}`)
          .expect(httpStatus.UNAUTHORIZED);
      });
    });
  });
});
