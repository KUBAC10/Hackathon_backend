import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';
import moment from 'moment';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory,
  questionFactory,
  questionItemFactory,
  surveyFactory,
  surveyItemFactory,
  surveyResultFactory,
  surveySectionFactory,
  teamFactory,
  teamUserFactory,
  userFactory,
  countryFactory
} from '../../../../factories';

chai.config.includeStack = true;

const email = 'example@email.com';
const email2 = 'example2@email.com';
const email3 = 'example3@email.com';
const password = 'password';

let team;
let survey;
let surveySection;
let country1;
let country2;

async function makeTestData() {
  // create team and company
  const company = await companyFactory({});
  team = await teamFactory({ company });
  const team2 = await teamFactory({ company });

  // create survey
  survey = await surveyFactory({ team });

  // create surveySection
  surveySection = await surveySectionFactory({ team, survey });

  // create countries
  [
    country1,
    country2
  ] = await Promise.all([
    countryFactory({}),
    countryFactory({})
  ]);

  // create Power User
  await userFactory({ email, password, company, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });

  // create User From Another Team
  const anotherTeamUser = await userFactory({
    email: email3,
    password,
    company,
    currentTeam: team2
  });
  await teamUserFactory({ user: anotherTeamUser, team: team2, company });
}

describe('## GET /api/v1/correlation/:id', () => {
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

      describe('overall', () => {
        let surveyItem1;
        let surveyItem2;
        let surveyItem3;
        let surveyItem4;
        let questionItem1;
        let questionItem2;

        before(async () => {
          // create questions
          const [
            question1,
            question2,
            question3,
            question4
          ] = await Promise.all([
            questionFactory({ team, type: 'slider' }),
            questionFactory({ team, type: 'thumbs' }),
            questionFactory({ team, type: 'checkboxes' }),
            questionFactory({ team, type: 'countryList' })
          ]);

          // create questionItems
          [
            questionItem1,
            questionItem2
          ] = await Promise.all([
            questionItemFactory({ team, question: question3 }),
            questionItemFactory({ team, question: question3 })
          ]);

          // create surveyItems
          [
            surveyItem1,
            surveyItem2,
            surveyItem3,
            surveyItem4
          ] = await Promise.all([
            surveyItemFactory({ team, survey, question: question1._id, surveySection }),
            surveyItemFactory({ team, survey, question: question2._id, surveySection }),
            surveyItemFactory({ team, survey, question: question3._id, surveySection }),
            surveyItemFactory({ team, survey, question: question4._id, surveySection })
          ]);

          // create surveyResults with answer data
          await Promise.all([
            surveyResultFactory({
              team,
              survey,
              answer: {
                [surveyItem1._id]: { value: 0 },
                [surveyItem2._id]: { value: 'no' },
                [surveyItem3._id]: { questionItems: [questionItem2._id] },
                [surveyItem4._id]: { country: country1._id.toString() }
              } }),
            surveyResultFactory({
              team,
              survey,
              answer: {
                [surveyItem1._id]: { value: 0 },
                [surveyItem2._id]: { value: 'no' },
                [surveyItem3._id]: { questionItems: [questionItem2._id] },
                [surveyItem4._id]: { country: country1._id.toString() }
              } }),
            surveyResultFactory({
              team,
              survey,
              answer: {
                [surveyItem1._id]: { value: 50 },
                [surveyItem2._id]: { value: 'yes' },
                [surveyItem3._id]: { questionItems: [questionItem1._id] },
                [surveyItem4._id]: { country: country2._id.toString() }
              } }),
            surveyResultFactory({
              team,
              survey,
              answer: {
                [surveyItem1._id]: { value: 50 },
                [surveyItem2._id]: { value: 'yes' },
                [surveyItem3._id]: { questionItems: [questionItem1._id] },
                [surveyItem4._id]: { country: country2._id.toString() }
              } })
          ]);
        });

        it('should count correlation between slider and thumb questions', async () => {
          const res = await agent
            .get(`/api/v1/correlation/${survey._id}`)
            .query({
              left: { surveyItem: surveyItem1._id.toString() },
              right: { surveyItem: surveyItem2._id.toString() },
              range: { overall: true }
            })
            .expect(httpStatus.OK);

          expect(res.body.correlation).to.be.eq(1);
        });

        it('should count correlation between slider and item questions', async () => {
          const res = await agent
            .get(`/api/v1/correlation/${survey._id}`)
            .query({
              left: { surveyItem: surveyItem1._id.toString() },
              right: {
                surveyItem: surveyItem3._id.toString(),
                questionItem: questionItem1._id.toString()
              },
              range: { overall: true }
            })
            .expect(httpStatus.OK);

          expect(res.body.correlation).to.be.eq(1);
        });

        it('should count correlation between thumb and item questions', async () => {
          const res = await agent
            .get(`/api/v1/correlation/${survey._id}`)
            .query({
              left: { surveyItem: surveyItem2._id.toString() },
              right: {
                surveyItem: surveyItem3._id.toString(),
                questionItem: questionItem1._id.toString()
              },
              range: { overall: true }
            })
            .expect(httpStatus.OK);

          expect(res.body.correlation).to.be.eq(1);
        });

        it('should count correlation between slider and countryList questions', async () => {
          const res = await agent
            .get(`/api/v1/correlation/${survey._id}`)
            .query({
              left: { surveyItem: surveyItem1._id.toString() },
              right: { surveyItem: surveyItem4._id.toString(), country: country2._id.toString() },
              range: { overall: true }
            })
            .expect(httpStatus.OK);

          expect(res.body.correlation).to.be.eq(1);
        });
      });

      describe('range', () => {
        let surveyItem1;
        let surveyItem2;
        let surveyItem3;
        let questionItem1;
        let questionItem2;

        before(async () => {
          // create questions
          const [
            question1,
            question2,
            question3
          ] = await Promise.all([
            questionFactory({ team, type: 'slider' }),
            questionFactory({ team, type: 'thumbs' }),
            questionFactory({ team, type: 'checkboxes' })
          ]);

          // create questionItems
          [
            questionItem1,
            questionItem2
          ] = await Promise.all([
            questionItemFactory({ team, question: question3 }),
            questionItemFactory({ team, question: question3 })
          ]);

          // create surveyItems
          [
            surveyItem1,
            surveyItem2,
            surveyItem3
          ] = await Promise.all([
            surveyItemFactory({ team, survey, question: question1._id, surveySection }),
            surveyItemFactory({ team, survey, question: question2._id, surveySection }),
            surveyItemFactory({ team, survey, question: question3._id, surveySection })
          ]);

          // create surveyResults with answer data
          await Promise.all([
            surveyResultFactory({
              team,
              survey,
              answer: {
                [surveyItem1._id]: { value: 0 },
                [surveyItem2._id]: { value: 'no' },
                [surveyItem3._id]: { questionItems: [questionItem2._id] },
              } }),
            surveyResultFactory({
              team,
              survey,
              answer: {
                [surveyItem1._id]: { value: 0 },
                [surveyItem2._id]: { value: 'no' },
                [surveyItem3._id]: { questionItems: [questionItem2._id] },
              } }),
            surveyResultFactory({
              team,
              survey,
              answer: {
                [surveyItem1._id]: { value: 50 },
                [surveyItem2._id]: { value: 'yes' },
                [surveyItem3._id]: { questionItems: [questionItem1._id] },
              } }),
            surveyResultFactory({
              team,
              survey,
              answer: {
                [surveyItem1._id]: { value: 50 },
                [surveyItem2._id]: { value: 'yes' },
                [surveyItem3._id]: { questionItems: [questionItem1._id] },
              } }),


            surveyResultFactory({
              team,
              survey,
              createdAt: moment().subtract(1, 'day').toDate(),
              answer: {
                [surveyItem1._id]: { value: 0 },
                [surveyItem2._id]: { value: 'yes' },
                [surveyItem3._id]: { questionItems: [questionItem2._id] },
              } }),
            surveyResultFactory({
              team,
              survey,
              createdAt: moment().subtract(1, 'day').toDate(),
              answer: {
                [surveyItem1._id]: { value: 0 },
                [surveyItem2._id]: { value: 'no' },
                [surveyItem3._id]: { questionItems: [questionItem1._id] },
              } }),
            surveyResultFactory({
              team,
              survey,
              createdAt: moment().subtract(1, 'day').toDate(),
              answer: {
                [surveyItem1._id]: { value: 0 },
                [surveyItem2._id]: { value: 'yes' },
                [surveyItem3._id]: { questionItems: [questionItem1._id] },
              } }),
            surveyResultFactory({
              team,
              survey,
              createdAt: moment().subtract(1, 'day').toDate(),
              answer: {
                [surveyItem1._id]: { value: 0 },
                [surveyItem2._id]: { value: 'no' },
                [surveyItem3._id]: { questionItems: [questionItem2._id] },
              } })
          ]);
        });

        it('should count correlation between slider and thumb questions', async () => {
          const res = await agent
            .get(`/api/v1/correlation/${survey._id}`)
            .query({
              left: { surveyItem: surveyItem1._id.toString() },
              right: { surveyItem: surveyItem2._id.toString() }
            })
            .expect(httpStatus.OK);

          expect(res.body.correlation).to.be.eq(1);
        });

        it('should count correlation between slider and item questions', async () => {
          const res = await agent
            .get(`/api/v1/correlation/${survey._id}`)
            .query({
              left: { surveyItem: surveyItem1._id.toString() },
              right: {
                surveyItem: surveyItem3._id.toString(),
                questionItem: questionItem1._id.toString()
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.correlation).to.be.eq(1);
        });

        it('should count correlation between thumb and item questions', async () => {
          const res = await agent
            .get(`/api/v1/correlation/${survey._id}`)
            .query({
              left: { surveyItem: surveyItem2._id.toString() },
              right: {
                surveyItem: surveyItem3._id.toString(),
                questionItem: questionItem1._id.toString()
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.correlation).to.be.eq(1);
        });
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

      describe('overall', () => {
        let surveyItem1;
        let surveyItem2;
        let surveyItem3;
        let surveyItem4;
        let questionItem1;
        let questionItem2;

        before(async () => {
          // create questions
          const [
            question1,
            question2,
            question3,
            question4
          ] = await Promise.all([
            questionFactory({ team, type: 'slider' }),
            questionFactory({ team, type: 'thumbs' }),
            questionFactory({ team, type: 'checkboxes' }),
            questionFactory({ team, type: 'countryList' })
          ]);

          // create questionItems
          [
            questionItem1,
            questionItem2
          ] = await Promise.all([
            questionItemFactory({ team, question: question3 }),
            questionItemFactory({ team, question: question3 })
          ]);

          // create surveyItems
          [
            surveyItem1,
            surveyItem2,
            surveyItem3,
            surveyItem4
          ] = await Promise.all([
            surveyItemFactory({ team, survey, question: question1._id, surveySection }),
            surveyItemFactory({ team, survey, question: question2._id, surveySection }),
            surveyItemFactory({ team, survey, question: question3._id, surveySection }),
            surveyItemFactory({ team, survey, question: question4._id, surveySection })
          ]);

          // create surveyResults with answer data
          await Promise.all([
            surveyResultFactory({
              team,
              survey,
              answer: {
                [surveyItem1._id]: { value: 0 },
                [surveyItem2._id]: { value: 'no' },
                [surveyItem3._id]: { questionItems: [questionItem2._id] },
                [surveyItem4._id]: { country: country1._id.toString() }
              } }),
            surveyResultFactory({
              team,
              survey,
              answer: {
                [surveyItem1._id]: { value: 0 },
                [surveyItem2._id]: { value: 'no' },
                [surveyItem3._id]: { questionItems: [questionItem2._id] },
                [surveyItem4._id]: { country: country1._id.toString() }
              } }),
            surveyResultFactory({
              team,
              survey,
              answer: {
                [surveyItem1._id]: { value: 50 },
                [surveyItem2._id]: { value: 'yes' },
                [surveyItem3._id]: { questionItems: [questionItem1._id] },
                [surveyItem4._id]: { country: country2._id.toString() }
              } }),
            surveyResultFactory({
              team,
              survey,
              answer: {
                [surveyItem1._id]: { value: 50 },
                [surveyItem2._id]: { value: 'yes' },
                [surveyItem3._id]: { questionItems: [questionItem1._id] },
                [surveyItem4._id]: { country: country2._id.toString() }
              } })
          ]);
        });

        it('should count correlation between slider and thumb questions', async () => {
          const res = await agent
            .get(`/api/v1/correlation/${survey._id}`)
            .query({
              left: { surveyItem: surveyItem1._id.toString() },
              right: { surveyItem: surveyItem2._id.toString() },
              range: { overall: true }
            })
            .expect(httpStatus.OK);

          expect(res.body.correlation).to.be.eq(1);
        });

        it('should count correlation between slider and item questions', async () => {
          const res = await agent
            .get(`/api/v1/correlation/${survey._id}`)
            .query({
              left: { surveyItem: surveyItem1._id.toString() },
              right: {
                surveyItem: surveyItem3._id.toString(),
                questionItem: questionItem1._id.toString()
              },
              range: { overall: true }
            })
            .expect(httpStatus.OK);

          expect(res.body.correlation).to.be.eq(1);
        });

        it('should count correlation between thumb and item questions', async () => {
          const res = await agent
            .get(`/api/v1/correlation/${survey._id}`)
            .query({
              left: { surveyItem: surveyItem2._id.toString() },
              right: {
                surveyItem: surveyItem3._id.toString(),
                questionItem: questionItem1._id.toString()
              },
              range: { overall: true }
            })
            .expect(httpStatus.OK);

          expect(res.body.correlation).to.be.eq(1);
        });

        it('should count correlation between slider and countryList questions', async () => {
          const res = await agent
            .get(`/api/v1/correlation/${survey._id}`)
            .query({
              left: { surveyItem: surveyItem1._id.toString() },
              right: { surveyItem: surveyItem4._id.toString(), country: country2._id.toString() },
              range: { overall: true }
            })
            .expect(httpStatus.OK);

          expect(res.body.correlation).to.be.eq(1);
        });
      });

      describe('range', () => {
        let surveyItem1;
        let surveyItem2;
        let surveyItem3;
        let questionItem1;
        let questionItem2;

        before(async () => {
          // create questions
          const [
            question1,
            question2,
            question3
          ] = await Promise.all([
            questionFactory({ team, type: 'slider' }),
            questionFactory({ team, type: 'thumbs' }),
            questionFactory({ team, type: 'checkboxes' })
          ]);

          // create questionItems
          [
            questionItem1,
            questionItem2
          ] = await Promise.all([
            questionItemFactory({ team, question: question3 }),
            questionItemFactory({ team, question: question3 })
          ]);

          // create surveyItems
          [
            surveyItem1,
            surveyItem2,
            surveyItem3
          ] = await Promise.all([
            surveyItemFactory({ team, survey, question: question1._id, surveySection }),
            surveyItemFactory({ team, survey, question: question2._id, surveySection }),
            surveyItemFactory({ team, survey, question: question3._id, surveySection })
          ]);

          // create surveyResults with answer data
          await Promise.all([
            surveyResultFactory({
              team,
              survey,
              answer: {
                [surveyItem1._id]: { value: 0 },
                [surveyItem2._id]: { value: 'no' },
                [surveyItem3._id]: { questionItems: [questionItem2._id] },
              } }),
            surveyResultFactory({
              team,
              survey,
              answer: {
                [surveyItem1._id]: { value: 0 },
                [surveyItem2._id]: { value: 'no' },
                [surveyItem3._id]: { questionItems: [questionItem2._id] },
              } }),
            surveyResultFactory({
              team,
              survey,
              answer: {
                [surveyItem1._id]: { value: 50 },
                [surveyItem2._id]: { value: 'yes' },
                [surveyItem3._id]: { questionItems: [questionItem1._id] },
              } }),
            surveyResultFactory({
              team,
              survey,
              answer: {
                [surveyItem1._id]: { value: 50 },
                [surveyItem2._id]: { value: 'yes' },
                [surveyItem3._id]: { questionItems: [questionItem1._id] },
              } }),


            surveyResultFactory({
              team,
              survey,
              createdAt: moment().subtract(1, 'day').toDate(),
              answer: {
                [surveyItem1._id]: { value: 0 },
                [surveyItem2._id]: { value: 'yes' },
                [surveyItem3._id]: { questionItems: [questionItem2._id] },
              } }),
            surveyResultFactory({
              team,
              survey,
              createdAt: moment().subtract(1, 'day').toDate(),
              answer: {
                [surveyItem1._id]: { value: 0 },
                [surveyItem2._id]: { value: 'no' },
                [surveyItem3._id]: { questionItems: [questionItem1._id] },
              } }),
            surveyResultFactory({
              team,
              survey,
              createdAt: moment().subtract(1, 'day').toDate(),
              answer: {
                [surveyItem1._id]: { value: 0 },
                [surveyItem2._id]: { value: 'yes' },
                [surveyItem3._id]: { questionItems: [questionItem1._id] },
              } }),
            surveyResultFactory({
              team,
              survey,
              createdAt: moment().subtract(1, 'day').toDate(),
              answer: {
                [surveyItem1._id]: { value: 0 },
                [surveyItem2._id]: { value: 'no' },
                [surveyItem3._id]: { questionItems: [questionItem2._id] },
              } })
          ]);
        });

        it('should count correlation between slider and thumb questions', async () => {
          const res = await agent
            .get(`/api/v1/correlation/${survey._id}`)
            .query({
              left: { surveyItem: surveyItem1._id.toString() },
              right: { surveyItem: surveyItem2._id.toString() }
            })
            .expect(httpStatus.OK);

          expect(res.body.correlation).to.be.eq(1);
        });

        it('should count correlation between slider and item questions', async () => {
          const res = await agent
            .get(`/api/v1/correlation/${survey._id}`)
            .query({
              left: { surveyItem: surveyItem1._id.toString() },
              right: {
                surveyItem: surveyItem3._id.toString(),
                questionItem: questionItem1._id.toString()
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.correlation).to.be.eq(1);
        });

        it('should count correlation between thumb and item questions', async () => {
          const res = await agent
            .get(`/api/v1/correlation/${survey._id}`)
            .query({
              left: { surveyItem: surveyItem2._id.toString() },
              right: {
                surveyItem: surveyItem3._id.toString(),
                questionItem: questionItem1._id.toString()
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.correlation).to.be.eq(1);
        });

        it('should return 0 if results does not exists', async () => {
          const anotherSurvey = await surveyFactory({ team });
          const res = await agent
            .get(`/api/v1/correlation/${anotherSurvey._id}`)
            .query({
              left: { surveyItem: surveyItem1._id.toString() },
              right: { surveyItem: surveyItem2._id.toString() }
            })
            .expect(httpStatus.OK);

          expect(res.body.correlation).to.be.eq(0);
        });

        it('should return 0 if pairs in results equal 0', async () => {
          const anotherSurvey = await surveyFactory({ team });
          await Promise.all([
            surveyResultFactory({
              team,
              survey: anotherSurvey,
              answer: {
                [surveyItem1._id]: { value: 0 },
                [surveyItem2._id]: { value: 'no' },
              } })
          ]);
          const res = await agent
            .get(`/api/v1/correlation/${anotherSurvey._id}`)
            .query({
              left: { surveyItem: surveyItem1._id.toString() },
              right: { surveyItem: surveyItem2._id.toString() },
              range: { overall: true }
            })
            .expect(httpStatus.OK);

          expect(res.body.correlation).to.be.eq(0);
        });
      });
    });

    describe('As User From Another Team', () => {
      const agent = request.agent(app);
      let surveyItem1;
      let surveyItem2;
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email3
          });

        // create surveyItems
        [
          surveyItem1,
          surveyItem2
        ] = await Promise.all([
          surveyItemFactory({ team, survey, surveySection }),
          surveyItemFactory({ team, survey, surveySection })]);
      });

      it('should return forbidden status', async () => {
        await agent
          .get(`/api/v1/correlation/${survey._id}`)
          .query({
            left: { surveyItem: surveyItem1._id.toString() },
            right: { surveyItem: surveyItem2._id.toString() }
          })
          .expect(httpStatus.FORBIDDEN);
      });

      it('should return not found status', async () => {
        await agent
          .get(`/api/v1/correlation/${team._id}`)
          .query({
            left: { surveyItem: surveyItem1._id.toString() },
            right: { surveyItem: surveyItem2._id.toString() }
          })
          .expect(httpStatus.NOT_FOUND);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get(`/api/v1/correlation/${survey._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
