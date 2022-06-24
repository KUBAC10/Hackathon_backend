import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  userFactory,
  teamFactory,
  companyFactory,
  teamUserFactory,
  trashFactory,
  surveyFactory,
  surveyItemFactory,
  surveySectionFactory,
  contentItemFactory
} from '../../../../factories';

// models
import { Trash } from '../../../../../models';

chai.config.includeStack = true;

let team;
let team2;
let company;
let company2;
let anotherCompTeam;
let teamUser;
let powerUser;
let trash;

const password = 'qwe1';
const email = 'test1@email.com';
const email2 = 'test2@email.com';

async function makeTestData() {
  // create company and team
  [
    company,
    company2
  ] = await Promise.all([
    companyFactory({}),
    companyFactory({})
  ]);

  [
    team,
    team2,
    anotherCompTeam
  ] = await Promise.all([
    teamFactory({ company }),
    teamFactory({ company }),
    teamFactory({ company: company2 }) // another company team
  ]);

  // create users
  [
    powerUser,
    teamUser
  ] = await Promise.all([
    userFactory({ email, password, company, currentTeam: team, isPowerUser: true }),
    userFactory({
      email: email2, password, company, currentTeam: team, isPowerUser: false
    })
  ]);

  // create related team users models
  await Promise.all([
    teamUserFactory({ company, team, user: teamUser, }),
    teamUserFactory({ company, team: team2, user: teamUser }),
  ]);
}

describe('## POST /api/v1/trash/:id/restore', () => {
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
      });

      it('should restore item in current team', async () => {
        // create trash record
        trash = await trashFactory({ team: powerUser.currentTeam, company });

        await agent
          .post(`/api/v1/trash/${trash._id}/restore`)
          .expect(httpStatus.OK);
      });

      it('should restore item in any company team', async () => {
        // create trash record
        trash = await trashFactory({ team: team2, company });

        await agent
          .post(`/api/v1/trash/${trash._id}/restore`)
          .expect(httpStatus.OK);
      });

      it('should not restore item in another company team', async () => {
        // create trash record
        trash = await trashFactory({ team: anotherCompTeam, company: company2 });

        await agent
          .post(`/api/v1/trash/${trash._id}/restore`)
          .expect(httpStatus.FORBIDDEN);
      });

      it('should return not found status', async () => {
        await agent
          .post(`/api/v1/trash/${company._id}/restore`)
          .expect(httpStatus.NOT_FOUND);
      });

      it('should restore survey item to last section', async () => {
        const survey = await surveyFactory({ team, company });

        const [
          section1,
          section3
        ] = await Promise.all([
          surveySectionFactory({ team, company, survey, sortableId: 0 }),
          surveySectionFactory({ team, company, survey, sortableId: 2 }),
          surveySectionFactory({ team, company, survey, sortableId: 1 })
        ]);

        const [
          surveyItem1
        ] = await Promise.all([
          surveyItemFactory({ team, company, survey, surveySection: section1 }),
          surveyItemFactory({ team, company, survey, surveySection: section3, sortableId: 0 }),
          surveyItemFactory({ team, company, survey, surveySection: section3, sortableId: 1 })
        ]);

        // remove section
        await agent
          .post(`/api/v1/drafts/${survey._id}`)
          .send({
            entity: 'surveySection',
            action: 'remove',
            entityId: section1._id
          })
          .expect(httpStatus.OK);

        const trash = await Trash.model
          .findOne({ surveyItem: surveyItem1._id })
          .lean();

        expect(trash).to.be.an('object');

        const res2 = await agent
          .post(`/api/v1/trash/${trash._id}/restore`)
          .expect(httpStatus.OK);

        expect(res2.body.surveySection).to.be.eq(section3._id.toString());
        expect(res2.body.sortableId).to.be.eq(2);
      });

      it('should restore content item to last section', async () => {
        const survey = await surveyFactory({ team, company });

        const [
          section1,
          section3
        ] = await Promise.all([
          surveySectionFactory({ team, company, survey, sortableId: 0 }),
          surveySectionFactory({ team, company, survey, sortableId: 2 }),
          surveySectionFactory({ team, company, survey, sortableId: 1 })
        ]);

        const [
          surveyItem1,
          surveyItem2,
          surveyItem3,
        ] = await Promise.all([
          surveyItemFactory({ team, company, survey, surveySection: section1, type: 'contents' }),
          surveyItemFactory({ team, company, survey, surveySection: section3, sortableId: 0 }),
          surveyItemFactory({ team, company, survey, surveySection: section3, sortableId: 1 })
        ]);

        const content = await contentItemFactory({
          team, company, survey, surveyItem: surveyItem1
        });

        // remove section
        await agent
          .post(`/api/v1/drafts/${survey._id}`)
          .send({
            entity: 'surveySection',
            action: 'remove',
            entityId: section1._id
          })
          .expect(httpStatus.OK);

        const trash = await Trash.model
          .findOne({ contentItem: content._id })
          .lean();

        expect(trash).to.be.an('object');

        const res2 = await agent
          .post(`/api/v1/trash/${trash._id}/restore`)
          .expect(httpStatus.OK);

        expect(res2.body.surveySection).to.be.eq(section3._id.toString());
        expect(res2.body.sortableId).to.be.eq(2);
        expect(res2.body._id.toString()).not.be.eq(surveyItem1._id.toString());
        expect(res2.body._id.toString()).not.be.eq(surveyItem2._id.toString());
        expect(res2.body._id.toString()).not.be.eq(surveyItem3._id.toString());
      });
    });

    describe('As team user', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should set stage to clearing in current team', async () => {
        // create trash record
        trash = await trashFactory({ team: teamUser.currentTeam, company });

        await agent
          .post(`/api/v1/trash/${trash._id}/restore`)
          .expect(httpStatus.OK);
      });

      it('should not set stage to clearing in other company team', async () => {
        // create trash record
        trash = await trashFactory({ team: team2, company });

        await agent
          .post(`/api/v1/trash/${trash._id}/restore`)
          .expect(httpStatus.FORBIDDEN);
      });

      it('should not set stage to clearing in another company team', async () => {
        // create trash record
        trash = await trashFactory({ team: anotherCompTeam, company: company2 });

        await agent
          .post(`/api/v1/trash/${trash._id}/restore`)
          .expect(httpStatus.FORBIDDEN);
      });

      it('should return not found status', async () => {
        await agent
          .post(`/api/v1/trash/${company._id}/restore`)
          .expect(httpStatus.NOT_FOUND);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      // create trash record
      trash = await trashFactory({ team: powerUser.currentTeam, company });

      await request(app)
        .post(`/api/v1/trash/${trash._id}/restore`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
