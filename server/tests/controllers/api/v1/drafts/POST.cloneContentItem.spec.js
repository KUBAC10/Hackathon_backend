import request from 'supertest';
import httpStatus from 'http-status';
import { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory,
  contentItemFactory,
  surveyFactory,
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
  team = await teamFactory({});

  survey = await surveyFactory({ team, company });

  // create users
  let user = await userFactory({ email, password, currentTeam: team, company, isPowerUser: true });
  await teamUserFactory({ user, team, company });

  // create Team user
  user = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user, team, company });
}

describe('## POST /api/v1/drafts/clone-content-item', () => {
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

      it('Should clone content item', async () => {
        const contentItem = await contentItemFactory({ team, company, survey });

        const res = await agent
          .post('/api/v1/drafts/clone-content-item')
          .send({
            contentItemId: contentItem._id
          })
          .expect(httpStatus.CREATED);

        expect(res.body.sortableId).to.be.eq(contentItem.sortableId + 1);
      });

      // example, user1 created contentItem1, user2 had clone -> should be createdBy: user2
      xit('should set correct createdBy of ALL cloned items');

      xit('should set correct sortableId after clone of contentItem');
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

      it('Should clone content item', async () => {
        const contentItem = await contentItemFactory({ team, company, survey });

        const res = await agent
          .post('/api/v1/drafts/clone-content-item')
          .send({
            contentItemId: contentItem._id
          })
          .expect(httpStatus.CREATED);

        expect(res.body.sortableId).to.be.eq(contentItem.sortableId + 1);
      });
    });
  });
});
