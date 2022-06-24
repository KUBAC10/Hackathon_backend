import request from 'supertest';
import httpStatus from 'http-status';
import { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

// factories
import {
  companyFactory, contentItemFactory, surveyFactory,
  teamFactory,
  teamUserFactory,
  userFactory
} from '../../../../factories';

const password = 'qwe123qwe';
const email = 'poweser@email.com';
const email2 = 'teamusser@email.com';

let company;
let team;
let survey;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create users
  let user = await userFactory({ email, password, currentTeam: team, company, isPowerUser: true });
  await teamUserFactory({ user, team, company });

  // create Team user
  user = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user, team, company });
}

describe('## POST /api/v1/drafts/switch-page/:id', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('As Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email
          });
      });

      it('should switch default start page', async () => {
        survey = await surveyFactory({ company, team });

        const [content2] = await Promise.all([
          contentItemFactory({ team, company, survey, sortableId: 1, type: 'startPage' }),
          contentItemFactory({ team, company, survey, sortableId: 0, default: true, type: 'startPage' }),
          contentItemFactory({ team, company, survey, sortableId: 2, type: 'startPage' }),
        ]);

        const res = await agent
          .post(`/api/v1/drafts/switch-page/${survey._id}`)
          .send({
            entityId: content2._id,
            type: 'startPage'
          })
          .expect(httpStatus.OK);

        const [
          reloadContent1,
          reloadContent2,
          reloadContent3,
        ] = res.body;

        expect(reloadContent1.default).to.be.eq(false);
        expect(reloadContent2.default).to.be.eq(true);
        expect(reloadContent3.default).to.be.eq(false);
      });
    });

    describe('As Team User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email2
          });
      });

      it('should switch default start page', async () => {
        survey = await surveyFactory({ company, team });

        const [content2] = await Promise.all([
          contentItemFactory({ team, company, survey, sortableId: 1, type: 'startPage' }),
          contentItemFactory({ team, company, survey, sortableId: 0, default: true, type: 'startPage' }),
          contentItemFactory({ team, company, survey, sortableId: 2, type: 'startPage' }),
        ]);

        const res = await agent
          .post(`/api/v1/drafts/switch-page/${survey._id}`)
          .send({
            entityId: content2._id,
            type: 'startPage'
          })
          .expect(httpStatus.OK);

        const [
          reloadContent1,
          reloadContent2,
          reloadContent3,
        ] = res.body;

        expect(reloadContent1.default).to.be.eq(false);
        expect(reloadContent2.default).to.be.eq(true);
        expect(reloadContent3.default).to.be.eq(false);
      });
    });
  });

  describe('Unauthorized', () => {

  });
});
