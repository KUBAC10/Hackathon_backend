import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

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
  assetFactory,
} from 'server/tests/factories';

chai.config.includeStack = true;

const email = 'power@email.com';
const password = 'qwe123qwe';
const entities = [
  { name: 'teams', model: 'Team' },
  { name: 'contacts', model: 'Contact' },
  { name: 'users', model: 'User' },
  { name: 'tags', model: 'Tag' },
  { name: 'questions', model: 'Question' },
  { name: 'surveys', model: 'Survey' },
  { name: 'survey-results', model: 'SurveyResult' },
  { name: 'assets', model: 'Asset' },
];

let company1;
let company2;
const ids = {};

async function makeTestData() {
  [
    company1,
    company2
  ] = await Promise.all([
    companyFactory({}),
    companyFactory({})
  ]);

  // create Power user
  await userFactory({ email, password, company: company1, isPowerUser: true });

  // create entities in different company scopes
  for (const company of [company1, company2]) {
    ids[company._id] = {};
    // create data
    const data = await Promise.all([
      teamFactory({ company }),
      contactFactory({ company }),
      userFactory({ company }),
      tagFactory({ company }),
      questionFactory({ company, trend: true }),
      surveyFactory({ company }),
      surveyResultFactory({ company }),
      assetFactory({ company }),
    ]);
    // set IDs
    entities
      .forEach((e, index) => (ids[company._id][e.name] = data[index]._id.toString()));
  }
}

describe('## GET /api/v1/:list/:id', () => {
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
      it(`should return entity from list ${item.name} by id`, async () => {
        const id = ids[company1._id][item.name];
        const res = await agent
          .get(`/api/v1/${item.name}/${id}`)
          .expect(httpStatus.OK);
        expect(res.body._id).to.be.eq(id);
      });

      it(`should return forbidden for entity from list ${item.name} by id from another company`, async () => {
        const id = ids[company2._id][item.name];
        await agent
          .get(`/api/v1/${item.name}/${id}`)
          .expect(httpStatus.FORBIDDEN);
      });

      it(`should reject not found for entity from list ${item.name} by id from another company`, async () => {
        await agent
          .get(`/api/v1/${item.name}/${company1._id}`)
          .expect(httpStatus.NOT_FOUND);
      });
    });
  });

  describe('Unauthorized', () => {
    entities.forEach((item) => {
      it(`should reject with unauthorized status for ${item.name}`, async () => {
        const id = ids[company1._id][item.name];
        await request(app)
          .get(`/api/v1/${item.name}/${id}`)
          .expect(httpStatus.UNAUTHORIZED);
      });
    });
  });
});
