import request from 'supertest';
import httpStatus from 'http-status';
import { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

import {
  companyFactory, contentItemFactory, questionFactory,
  surveyFactory, surveyItemFactory,
  surveySectionFactory,
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
let surveySection;
let question1;
let question2;
let contentItem;
let surveyItem1;
let surveyItem2;
let surveyItem3;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({});

  survey = await surveyFactory({ team, company });

  surveySection = await surveySectionFactory({ survey, team, company });

  [
    question1,
    question2
  ] = await Promise.all([
    questionFactory({ company, team }),
    questionFactory({ company, team, trend: true })
  ]);

  [
    surveyItem1,
    surveyItem2,
    surveyItem3
  ] = await Promise.all([
    surveyItemFactory({ survey, surveySection, team, company, sortableId: 0, question: question1 }),
    surveyItemFactory({ survey, surveySection, team, company, sortableId: 1, question: question2, type: 'trendQuestion' }),
    surveyItemFactory({ survey, surveySection, team, company, sortableId: 2, type: 'contents' })
  ]);

  contentItem = await contentItemFactory({ company, team, surveyItem: surveyItem3, survey });

  // create users
  let user = await userFactory({ email, password, currentTeam: team, company, isPowerUser: true });
  await teamUserFactory({ user, team, company });

  // create Team user
  user = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user, team, company });
}

describe('## POST /api/v1/drafts/clone-survey-section - clone survey section', () => {
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

      it('should clone section', async () => {
        const res = await agent
          .post('/api/v1/drafts/clone-survey-section')
          .send({
            surveySectionId: surveySection._id,
            index: 0
          })
          .expect(httpStatus.OK);

        expect(res.body.surveyItems.length).to.be.eq(3);

        const [
          item1,
          item2,
          item3
        ] = res.body.surveyItems;

        expect(item1._id.toString()).to.not.be.eq(surveyItem1._id.toString());
        expect(item1.type).to.be.eq('question');
        expect(item1.question._id.toString()).to.not.be.eq(question1._id.toString());
        expect(item1.sortableId).to.be.eq(surveyItem1.sortableId);

        expect(item2._id.toString()).to.not.be.eq(surveyItem2._id.toString());
        expect(item2.type).to.be.eq('trendQuestion');
        expect(item2.question._id.toString()).to.be.eq(question2._id.toString());
        expect(item2.sortableId).to.be.eq(surveyItem2.sortableId);

        expect(item3._id.toString()).to.not.be.eq(surveyItem3._id.toString());
        expect(item3.type).to.be.eq('contents');
        expect(item3.contents.length).to.be.eq(1);

        const [content] = item3.contents;

        expect(content._id.toString()).to.not.be.eq(contentItem._id.toString());
        expect(content.type).to.be.eq(contentItem.type);
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

      it('should clone section', async () => {
        const res = await agent
          .post('/api/v1/drafts/clone-survey-section')
          .send({
            surveySectionId: surveySection._id,
            index: 0
          })
          .expect(httpStatus.OK);

        expect(res.body.surveyItems.length).to.be.eq(3);

        const [
          item1,
          item2,
          item3
        ] = res.body.surveyItems;

        expect(item1._id.toString()).to.not.be.eq(surveyItem1._id.toString());
        expect(item1.type).to.be.eq('question');
        expect(item1.question._id.toString()).to.not.be.eq(question1._id.toString());
        expect(item1.sortableId).to.be.eq(surveyItem1.sortableId);

        expect(item2._id.toString()).to.not.be.eq(surveyItem2._id.toString());
        expect(item2.type).to.be.eq('trendQuestion');
        expect(item2.question._id.toString()).to.be.eq(question2._id.toString());
        expect(item2.sortableId).to.be.eq(surveyItem2.sortableId);

        expect(item3._id.toString()).to.not.be.eq(surveyItem3._id.toString());
        expect(item3.type).to.be.eq('contents');
        expect(item3.contents.length).to.be.eq(1);

        const [content] = item3.contents;

        expect(content._id.toString()).to.not.be.eq(contentItem._id.toString());
        expect(content.type).to.be.eq(contentItem.type);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return unauthorized status', () => {
      request(app)
        .post('/api/v1/drafts/clone-survey-section')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
