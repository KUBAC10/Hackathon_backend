import request from 'supertest';
import httpStatus from 'http-status';
import { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory, questionFactory, surveyFactory,
  surveyItemFactory,
  surveySectionFactory,
  teamFactory,
  teamUserFactory,
  userFactory
} from '../../../../factories';

const password = 'qwe123qwe';
const email = 'poweser@email.com';
const email2 = 'teamusser@email.com';

let team;
let company;
let survey;
let surveySection1;
let surveySection2;
let surveyItem11;
let surveyItem12;
let surveyItem13;
let surveyItem21;
let surveyItem22;
let surveyItem23;
let question;

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

describe('## POST /api/v1/drafts', () => {
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

        survey = await surveyFactory({ company, team });

        [
          surveySection1,
          surveySection2
        ] = await Promise.all([
          surveySectionFactory({
            team,
            company,
            survey,
            sortableId: 0
          }),
          surveySectionFactory({
            team,
            company,
            survey,
            sortableId: 1
          })
        ]);

        question = await questionFactory({ team, company });

        [
          surveyItem11,
          surveyItem12,
          surveyItem13,
          surveyItem21,
          surveyItem22,
          surveyItem23,
        ] = await Promise.all([
          surveyItemFactory({
            team,
            company,
            survey,
            inDraft: true,
            sortableId: 0,
            surveySection: surveySection1._id,
            question: question._id
          }),
          surveyItemFactory({
            team,
            company,
            survey,
            inDraft: true,
            sortableId: 1,
            surveySection: surveySection1._id,
            question: question._id
          }),
          surveyItemFactory({
            team,
            company,
            survey,
            inDraft: true,
            sortableId: 2,
            surveySection: surveySection1._id,
            question: question._id
          }),
          surveyItemFactory({
            team,
            company,
            survey,
            inDraft: true,
            sortableId: 0,
            surveySection: surveySection2._id,
            question: question._id
          }),
          surveyItemFactory({
            team,
            company,
            survey,
            inDraft: true,
            sortableId: 1,
            surveySection: surveySection2._id,
            question: question._id
          }),
          surveyItemFactory({
            team,
            company,
            survey,
            inDraft: true,
            sortableId: 2,
            surveySection: surveySection2._id,
            question: question._id
          })
        ]);
      });

      it('should move survey item to another section', async () => {
        const res = await agent
          .post('/api/v1/drafts/move-survey-item')
          .send({
            surveySection: surveySection2._id,
            surveyItem: surveyItem13._id,
          })
          .expect(httpStatus.OK);

        expect(res.body.surveySections.length).to.be.eq(2);

        const [
          section1,
          section2
        ] = res.body.surveySections;

        expect(section1.surveyItems.length).to.be.eq(2);
        expect(section2.surveyItems.length).to.be.eq(4);

        const [reloadItem11, reloadItem12] = section1.surveyItems;
        const [reloadItem21, reloadItem22, reloadItem23, reloadItem24] = section2.surveyItems;

        expect(reloadItem11._id.toString()).to.be.eq(surveyItem11._id.toString());
        expect(reloadItem11.sortableId).to.be.eq(0);

        expect(reloadItem12._id.toString()).to.be.eq(surveyItem12._id.toString());
        expect(reloadItem12.sortableId).to.be.eq(1);

        expect(reloadItem21._id.toString()).to.be.eq(surveyItem21._id.toString());
        expect(reloadItem21.sortableId).to.be.eq(0);

        expect(reloadItem22._id.toString()).to.be.eq(surveyItem22._id.toString());
        expect(reloadItem22.sortableId).to.be.eq(1);

        expect(reloadItem23._id.toString()).to.be.eq(surveyItem23._id.toString());
        expect(reloadItem23.sortableId).to.be.eq(2);

        expect(reloadItem24._id.toString()).to.be.eq(surveyItem13._id.toString());
        expect(reloadItem24.sortableId).to.be.eq(3);
      });

      // section1: [1,2,3,4](items) -> move 2nd items to next sections,
      // should change sortableId to another items
      xit('should set correct sortableId to all affected surveyItems');
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

        survey = await surveyFactory({ company, team });

        [
          surveySection1,
          surveySection2
        ] = await Promise.all([
          surveySectionFactory({
            team,
            company,
            survey,
            sortableId: 0
          }),
          surveySectionFactory({
            team,
            company,
            survey,
            sortableId: 1
          })
        ]);

        question = await questionFactory({ team, company });

        [
          surveyItem11,
          surveyItem12,
          surveyItem13,
          surveyItem21,
          surveyItem22,
          surveyItem23,
        ] = await Promise.all([
          surveyItemFactory({
            team,
            company,
            survey,
            inDraft: true,
            sortableId: 0,
            surveySection: surveySection1._id,
            question: question._id
          }),
          surveyItemFactory({
            team,
            company,
            survey,
            inDraft: true,
            sortableId: 1,
            surveySection: surveySection1._id,
            question: question._id
          }),
          surveyItemFactory({
            team,
            company,
            survey,
            inDraft: true,
            sortableId: 2,
            surveySection: surveySection1._id,
            question: question._id
          }),
          surveyItemFactory({
            team,
            company,
            survey,
            inDraft: true,
            sortableId: 0,
            surveySection: surveySection2._id,
            question: question._id
          }),
          surveyItemFactory({
            team,
            company,
            survey,
            inDraft: true,
            sortableId: 1,
            surveySection: surveySection2._id,
            question: question._id
          }),
          surveyItemFactory({
            team,
            company,
            survey,
            inDraft: true,
            sortableId: 2,
            surveySection: surveySection2._id,
            question: question._id
          })
        ]);
      });

      it('should move survey item to another section', async () => {
        const res = await agent
          .post('/api/v1/drafts/move-survey-item')
          .send({
            surveySection: surveySection2._id,
            surveyItem: surveyItem13._id,
          })
          .expect(httpStatus.OK);

        expect(res.body.surveySections.length).to.be.eq(2);

        const [
          section1,
          section2
        ] = res.body.surveySections;

        expect(section1.surveyItems.length).to.be.eq(2);
        expect(section2.surveyItems.length).to.be.eq(4);

        const [reloadItem11, reloadItem12] = section1.surveyItems;
        const [reloadItem21, reloadItem22, reloadItem23, reloadItem24] = section2.surveyItems;

        expect(reloadItem11._id.toString()).to.be.eq(surveyItem11._id.toString());
        expect(reloadItem11.sortableId).to.be.eq(0);

        expect(reloadItem12._id.toString()).to.be.eq(surveyItem12._id.toString());
        expect(reloadItem12.sortableId).to.be.eq(1);

        expect(reloadItem21._id.toString()).to.be.eq(surveyItem21._id.toString());
        expect(reloadItem21.sortableId).to.be.eq(0);

        expect(reloadItem22._id.toString()).to.be.eq(surveyItem22._id.toString());
        expect(reloadItem22.sortableId).to.be.eq(1);

        expect(reloadItem23._id.toString()).to.be.eq(surveyItem23._id.toString());
        expect(reloadItem23.sortableId).to.be.eq(2);

        expect(reloadItem24._id.toString()).to.be.eq(surveyItem13._id.toString());
        expect(reloadItem24.sortableId).to.be.eq(3);
      });
    });
  });
});
