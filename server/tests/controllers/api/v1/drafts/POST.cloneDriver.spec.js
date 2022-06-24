import request from 'supertest';
import httpStatus from 'http-status';
import { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory,
  questionFactory,
  surveyFactory,
  surveyItemFactory,
  surveySectionFactory,
  teamFactory,
  teamUserFactory,
  userFactory,
  pulseSurveyDriverFactory
} from '../../../../factories';

const password = 'qwe123qwe';
const email = 'poweser@email.com';

let company;
let team;
let survey;
let pulseSurveyDriver;
let section1;
let section2;
let question1;
let question2;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({});

  survey = await surveyFactory({ team, company });

  pulseSurveyDriver = await pulseSurveyDriverFactory({ team, company, survey });

  [
    section1,
    section2
  ] = await Promise.all([
    surveySectionFactory({ survey, team, company, pulseSurveyDriver, sortableId: 0 }),
    surveySectionFactory({ survey, team, company, pulseSurveyDriver, sortableId: 1 })
  ]);

  [
    question1,
    question2
  ] = await Promise.all([
    questionFactory({ team, company, type: 'linearScale' }),
    questionFactory({ team, company, type: 'linearScale' })
  ]);

  await Promise.all([
    surveyItemFactory({ company, team, survey, surveySection: section1, question: question1 }),
    surveyItemFactory({ company, team, survey, surveySection: section2, question: question2 })
  ]);

  // create users
  const user = await userFactory({
    email,
    password,
    currentTeam: team,
    company,
    isPowerUser: true
  });

  await teamUserFactory({ user, team, company });
}

describe('## POST /api/v1/drafts/clone-driver - clone pulse survey driver', () => {
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

      it('should clone pulse survey driver', async () => {
        const res = await agent
          .post('/api/v1/drafts/clone-driver')
          .send({ driverId: pulseSurveyDriver._id })
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(survey._id.toString());
        expect(res.body.surveySections).to.be.an('array');
        expect(res.body.surveySections.length).to.be.eq(4);
        expect(res.body.pulseSurveyDrivers).to.be.an('array');
        expect(res.body.pulseSurveyDrivers.length).to.be.eq(2);

        const [sec1, sec2, sec3, sec4] = res.body.surveySections;
        const [d1, d2] = res.body.pulseSurveyDrivers;

        expect(d1.sortableId).to.be.eq(1);
        expect(d2.sortableId).to.be.eq(2);

        expect(sec1._id.toString()).to.be.eq(section1._id.toString());
        expect(sec1.pulseSurveyDriver._id.toString()).to.be.eq(d1._id.toString());
        expect(sec2._id.toString()).to.be.eq(section2._id.toString());
        expect(sec2.pulseSurveyDriver._id.toString()).to.be.eq(d1._id.toString());
        expect(sec3.name.en).to.be.eq(section1.name.en);
        expect(sec3.pulseSurveyDriver._id.toString()).to.be.eq(d2._id.toString());
        expect(sec4.name.en).to.be.eq(section2.name.en);
        expect(sec4.pulseSurveyDriver._id.toString()).to.be.eq(d2._id.toString());
      });

      it('should set correct driver sortableId', async () => {
        survey = await surveyFactory({ company, team });

        const [driver1] = await Promise.all([
          pulseSurveyDriverFactory({ survey, company, team, sortableId: 1 }),
          pulseSurveyDriverFactory({ survey, company, team, sortableId: 2 })
        ]);

        // clone first driver
        const res = await agent
          .post('/api/v1/drafts/clone-driver')
          .send({ driverId: driver1._id })
          .expect(httpStatus.OK);

        const [d1, d2, d3] = res.body.pulseSurveyDrivers;

        expect(d1.sortableId).to.be.eq(1);
        expect(d2.sortableId).to.be.eq(1.5);
        expect(d3.sortableId).to.be.eq(2);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return unauthorized status', () => {
      request(app)
        .post('/api/v1/drafts/clone-driver')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
