import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  surveyFactory,
  contentItemFactory,
  surveySectionFactory,
  companyFactory,
  teamFactory,
  userFactory,
  teamUserFactory, surveyItemFactory
} from '../../../../factories';

chai.config.includeStack = true;

const email = 'test@email.com';
const email2 = 'testTwo@email.com';
const password = 'qwe123qwe';

let team;
let company;
let survey;
let surveySection;
let contentItem;

async function makeTestData() {
  // create company and team
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create survey
  survey = await surveyFactory({ company, team, inDraft: true });

  // create power User
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const user = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user, team, company });
}

describe('## POST /api/v1/drafts/divide/:id', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('As Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });

        surveySection = await surveySectionFactory({ team, company, survey });
        contentItem = await contentItemFactory({ team, company, survey });
      });

      it('should create new survey and move content', async () => {
        const survey = await surveyFactory({ company, team, inDraft: true });
        const surveySection = await surveySectionFactory({ team, company, survey });
        const surveyItem = await surveyItemFactory({ team, company, survey, surveySection, type: 'contents' });

        const [
          contentItem1
        ] = await Promise.all([
          contentItemFactory({
            team,
            company,
            survey,
            surveyItem
          }),
          contentItemFactory({
            team,
            company,
            survey,
            surveyItem
          })
        ]);

        const res = await agent
          .post(`/api/v1/drafts/divide/${survey._id}`)
          .send({
            surveySection: surveySection._id.toString(),
            contentId: contentItem1._id.toString(),
            index: 1
          })
          .expect(httpStatus.CREATED);

        expect(res.body.sortableId).to.be.eq(1);

        const [reloadContent] = res.body.contents;

        expect(reloadContent._id.toString()).to.be.eq(contentItem1._id.toString());
      });

      // if moved new sortableId should be 0
      xit('should set correct sortableId to moved item');

      xit('should return new reloaded survey item with contents');
    });

    describe('As Team User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });

        surveySection = await surveySectionFactory({ team, company, survey });
        contentItem = await contentItemFactory({ team, company, survey });
      });

      it('should create new survey and move content', async () => {
        const survey = await surveyFactory({ company, team, inDraft: true });
        const surveySection = await surveySectionFactory({ team, company, survey });
        const surveyItem = await surveyItemFactory({ team, company, survey, surveySection, type: 'contents' });

        const [
          contentItem1
        ] = await Promise.all([
          contentItemFactory({
            team,
            company,
            survey,
            surveyItem
          }),
          contentItemFactory({
            team,
            company,
            survey,
            surveyItem
          })
        ]);

        const res = await agent
          .post(`/api/v1/drafts/divide/${survey._id}`)
          .send({
            surveySection: surveySection._id.toString(),
            contentId: contentItem1._id.toString(),
            index: 1
          })
          .expect(httpStatus.CREATED);

        expect(res.body.sortableId).to.be.eq(1);

        const [reloadContent] = res.body.contents;

        expect(reloadContent._id.toString()).to.be.eq(contentItem1._id.toString());
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post(`/api/v1/drafts/divide/${survey._id}`)
        .send({
          surveySection: surveySection._id.toString(),
          contentId: contentItem._id.toString(),
          sortableId: 1
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
