import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  userFactory,
  companyFactory,
  surveyFactory,
  teamFactory,
  surveySectionFactory,
  teamUserFactory
} from '../../../../factories';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'example1@email.com';
const email2 = 'example2@email.com';

let survey;
let surveySection;

async function makeTestData() {
  const company = await companyFactory({});
  const team = await teamFactory({ company });

  survey = await surveyFactory({
    team,
    company,
    inDraft: true,
    defaultLanguage: 'en',
    translation: {
      en: true,
      de: true
    }
  });

  surveySection = await surveySectionFactory({
    team,
    company,
    survey,
    inDraft: true,
    name: { en: 'Name' }
  });

  // create Power User
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const user = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user, team, company });
}

describe('## POST /api/v1/translation', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('as Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email
          });
      });

      it('should return translation for field', async () => {
        const res = await agent
          .get(`/api/v1/translation/${survey._id}`)
          .query({
            entity: 'surveySection',
            entityId: surveySection._id.toString(),
            field: 'name'
          })
          .expect(httpStatus.OK);

        expect(res.body.de).to.be.eq('translated to de');
      });
    });

    describe('as Team User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email2
          });
      });

      it('should return translation for field', async () => {
        const res = await agent
          .get(`/api/v1/translation/${survey._id}`)
          .query({
            entity: 'surveySection',
            entityId: surveySection._id.toString(),
            field: 'name'
          })
          .expect(httpStatus.OK);

        expect(res.body.de).to.be.eq('translated to de');
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get(`/api/v1/translation/${survey._id}`)
        .query({ lang: 'de' })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
