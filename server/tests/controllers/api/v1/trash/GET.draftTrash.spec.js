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
  questionFactory,
  surveyFactory,
  surveyItemFactory,
  surveySectionFactory,
  teamFactory,
  teamUserFactory,
  trashFactory,
  userFactory
} from '../../../../factories';

const password = 'qwe123qwe';
const email = 'poweser@email.com';
const email2 = 'teamusser@email.com';

let company;
let team;
let survey;
let surveySection;
let surveyItem;
let contentItem;
let question;

async function makeTestData() {
  // create company
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create survey
  survey = await surveyFactory({ team, company, inDraft: true });

  // create surveySection
  surveySection = await surveySectionFactory({ team, company, survey });

  // create question
  question = await questionFactory({ team, company });

  // create surveyItem
  surveyItem = await surveyItemFactory({
    team,
    company,
    surveySection,
    question,
    survey,
    draftData: {
      surveySection: surveySection._id,
      question: question._id
    }
  });

  // create content item
  contentItem = await contentItemFactory({ team, company, surveyItem });

  const time = Date.now();

  // create trash entities
  await Promise.all([
    trashFactory({
      team,
      company,
      surveyItem,
      draft: survey._id,
      stage: 'inDraft',
      type: 'surveyItem',
      createdAt: time
    }),
    trashFactory({
      team,
      company,
      contentItem,
      draft: survey._id,
      stage: 'inDraft',
      type: 'contentItem',
      createdAt: time + 1
    }),
    trashFactory({
      team,
      company,
      surveyItem,
      draft: survey._id,
      stage: 'initial',
      type: 'surveyItem',
    }),
    trashFactory({ team, company }),
    trashFactory({}),
  ]);

  // create users
  let user = await userFactory({ email, password, currentTeam: team, company, isPowerUser: true });
  await teamUserFactory({ user, team, company });

  // create Team user
  user = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user, team, company });
}

describe('## GET /api/v1/trash/draft/:id', () => {
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

      it('should return list of draft trash entities', async () => {
        const res = await agent
          .get(`/api/v1/trash/drafts/${survey._id}`)
          .query({
            stage: 'inDraft',
            limit: 10
          })
          .expect(httpStatus.OK);

        expect(res.body.resources.length).to.be.eq(2);
        expect(res.body.total).to.be.eq(2);

        const [
          surveyItemTrash,
          contentItemTrash
        ] = res.body.resources;

        expect(surveyItemTrash.surveyItem).to.be.an('object');
        expect(surveyItemTrash.surveyItem._id.toString()).to.be
          .eq(surveyItem._id.toString());

        expect(surveyItemTrash.surveyItem.surveySection).to.be.an('object');
        expect(surveyItemTrash.surveyItem.surveySection._id.toString()).to.be
          .eq(surveySection._id.toString());

        expect(surveyItemTrash.surveyItem.question).to.be.an('object');
        expect(surveyItemTrash.surveyItem.question._id.toString()).to.be
          .eq(question._id.toString());

        expect(contentItemTrash.contentItem).to.be.an('object');
        expect(contentItemTrash.contentItem._id.toString()).to.be
          .eq(contentItem._id.toString());

        expect(contentItemTrash.contentItem.surveyItem).to.be.an('object');
        expect(contentItemTrash.contentItem.surveyItem._id.toString()).to.be
          .eq(surveyItem._id.toString());

        expect(contentItemTrash.contentItem.surveyItem.surveySection).to.be.an('object');
        expect(contentItemTrash.contentItem.surveyItem.surveySection._id.toString()).to.be
          .eq(surveySection._id.toString());
      });

      it('should return list of initial trash entities', async () => {
        const res = await agent
          .get(`/api/v1/trash/drafts/${survey._id}`)
          .query({
            stage: 'initial',
            limit: 10
          })
          .expect(httpStatus.OK);

        expect(res.body.resources.length).to.be.eq(1);
        expect(res.body.total).to.be.eq(1);

        const [trash] = res.body.resources;

        expect(trash.surveyItem).to.be.an('object');
        expect(trash.surveyItem._id.toString()).to.be.eq(surveyItem._id.toString());
        expect(trash.surveyItem.surveySection).to.be.an('object');
        expect(trash.surveyItem.surveySection._id.toString()).to.be
          .eq(surveySection._id.toString());
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

      it('should return list of draft trash entities', async () => {
        const res = await agent
          .get(`/api/v1/trash/drafts/${survey._id}`)
          .query({
            stage: 'inDraft',
            limit: 10
          })
          .expect(httpStatus.OK);

        expect(res.body.resources.length).to.be.eq(2);
        expect(res.body.total).to.be.eq(2);

        const [
          surveyItemTrash,
          contentItemTrash
        ] = res.body.resources;

        expect(surveyItemTrash.surveyItem).to.be.an('object');
        expect(surveyItemTrash.surveyItem._id.toString()).to.be
          .eq(surveyItem._id.toString());

        expect(surveyItemTrash.surveyItem.surveySection).to.be.an('object');
        expect(surveyItemTrash.surveyItem.surveySection._id.toString()).to.be
          .eq(surveySection._id.toString());

        expect(surveyItemTrash.surveyItem.question).to.be.an('object');
        expect(surveyItemTrash.surveyItem.question._id.toString()).to.be
          .eq(question._id.toString());

        expect(contentItemTrash.contentItem).to.be.an('object');
        expect(contentItemTrash.contentItem._id.toString()).to.be
          .eq(contentItem._id.toString());

        expect(contentItemTrash.contentItem.surveyItem).to.be.an('object');
        expect(contentItemTrash.contentItem.surveyItem._id.toString()).to.be
          .eq(surveyItem._id.toString());

        expect(contentItemTrash.contentItem.surveyItem.surveySection).to.be.an('object');
        expect(contentItemTrash.contentItem.surveyItem.surveySection._id.toString()).to.be
          .eq(surveySection._id.toString());
      });

      it('should return list of initial trash entities', async () => {
        const res = await agent
          .get(`/api/v1/trash/drafts/${survey._id}`)
          .query({
            stage: 'initial',
            limit: 10
          })
          .expect(httpStatus.OK);

        expect(res.body.resources.length).to.be.eq(1);
        expect(res.body.total).to.be.eq(1);

        const [trash] = res.body.resources;

        expect(trash.surveyItem).to.be.an('object');
        expect(trash.surveyItem._id.toString()).to.be.eq(surveyItem._id.toString());
        expect(trash.surveyItem.surveySection).to.be.an('object');
        expect(trash.surveyItem.surveySection._id.toString()).to.be
          .eq(surveySection._id.toString());
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get(`/api/v1/trash/drafts/${survey._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
