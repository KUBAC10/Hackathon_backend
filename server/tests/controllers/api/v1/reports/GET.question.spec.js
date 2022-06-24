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
  teamFactory,
  userFactory,
  surveyFactory,
  surveyItemFactory,
  surveyResultFactory,
  questionFactory,
  teamUserFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

let team;
let team2;
let company;
let question;
let surveyItem;
let teamUser;
let teamUser2;
const password = 'qwe123qwe';
const email = 'test@email.com';
const email2 = 'test2@email.com';
const email3 = 'test3@email.com';

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });
  team2 = await teamFactory({ company });
  const survey = await surveyFactory({});
  question = await questionFactory({ company, team });
  surveyItem = await surveyItemFactory({ survey, question });

  await surveyResultFactory({ survey });

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  teamUser = await userFactory({ email: email3, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });

  // create Team user from another team
  teamUser2 = await userFactory({ email: email2, password, company, currentTeam: team2 });
  await teamUserFactory({ user: teamUser2, team: team2, company });
}

describe('## GET /api/v1/reports/question', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('as Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
      });

      describe('overall', () => {
        it('should return data by question', async () => {
          const res = await agent
            .get('/api/v1/reports/question')
            .query({
              questionId: question._id.toString(),
              surveyItem: surveyItem._id.toString(),
              range: { overall: true }
            })
            .expect(httpStatus.OK);

          expect(res.body.date).to.be.eq(moment().format('YYYY-MM-DD'));
          expect(res.body.question.type).to.be.eq('text');
          expect(res.body.question._id).to.be.eq(question._id.toString());
        });
      });

      describe('summary', () => {
        it('should return summary question data', async () => {
          const res = await agent
            .get('/api/v1/reports/question')
            .query({
              questionId: question._id.toString(),
              surveyItem: surveyItem._id.toString(),
              range: { summary: true }
            })
            .expect(httpStatus.OK);

          expect(res.body.question.type).to.be.eq('text');
          expect(res.body.question._id).to.be.eq(question._id.toString());
        });
      });

      describe('by range', async () => {
        it('should return question data by range', async () => {
          const res = await agent
            .get('/api/v1/reports/question')
            .query({
              questionId: question._id.toString(),
              surveyItem: surveyItem._id.toString(),
              range: {
                from: moment().startOf('day').format('X'),
                to: moment().endOf('day').format('X')
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.question.type).to.be.eq('text');
          expect(res.body.question._id).to.be.eq(question._id.toString());
        });
      });
    });

    describe('as Team User', () => {
      describe('from current team', () => {
        const agent = request.agent(app);
        before(async () => {
          await agent
            .post('/api/v1/authentication')
            .send({
              login: email3,
              password
            });
        });

        describe('overall', () => {
          it('should return data by question', async () => {
            const res = await agent
              .get('/api/v1/reports/question')
              .query({
                questionId: question._id.toString(),
                surveyItem: surveyItem._id.toString(),
                range: { overall: true }
              })
              .expect(httpStatus.OK);

            expect(res.body.date).to.be.eq(moment().format('YYYY-MM-DD'));
            expect(res.body.question.type).to.be.eq('text');
            expect(res.body.question._id).to.be.eq(question._id.toString());
          });
        });

        describe('summary', () => {
          it('should return summary survey data', async () => {
            const res = await agent
              .get('/api/v1/reports/question')
              .query({
                questionId: question._id.toString(),
                surveyItem: surveyItem._id.toString(),
                range: { summary: true }
              })
              .expect(httpStatus.OK);

            expect(res.body.question.type).to.be.eq('text');
            expect(res.body.question._id).to.be.eq(question._id.toString());
          });
        });

        describe('by range', async () => {
          it('should return survey data by range', async () => {
            const res = await agent
              .get('/api/v1/reports/question')
              .query({
                questionId: question._id.toString(),
                surveyItem: surveyItem._id.toString(),
                range: {
                  from: moment().startOf('day').format('X'),
                  to: moment().endOf('day').format('X')
                }
              })
              .expect(httpStatus.OK);

            expect(res.body.question.type).to.be.eq('text');
            expect(res.body.question._id).to.be.eq(question._id.toString());
          });
        });
      });

      describe('from another team', () => {
        const agent = request.agent(app);
        before(async () => {
          await agent
            .post('/api/v1/authentication')
            .send({
              login: email2,
              password
            });
        });

        describe('overall', () => {
          it('should not return data', async () => {
            await agent
              .get('/api/v1/reports/question')
              .query({
                questionId: question._id.toString(),
                surveyItemId: surveyItem._id.toString(),
                range: { overall: true }
              })
              .expect(httpStatus.FORBIDDEN);
          });
        });

        describe('summary', () => {
          it('should not return data', async () => {
            await agent
              .get('/api/v1/reports/question')
              .query({
                questionId: question._id.toString(),
                surveyItemId: surveyItem._id.toString(),
                range: { summary: true }
              })
              .expect(httpStatus.FORBIDDEN);
          });
        });

        describe('by range', () => {
          it('should not return data', async () => {
            await agent
              .get('/api/v1/reports/question')
              .query({
                questionId: question._id.toString(),
                surveyItemId: surveyItem._id.toString(),
                range: {
                  from: moment().startOf('day').format('X'),
                  to: moment().endOf('day').format('X')
                }
              })
              .expect(httpStatus.FORBIDDEN);
          });

          it('should return not found data', async () => {
            await agent
              .get('/api/v1/reports/question')
              .query({
                questionId: question._id.toString(),
                surveyItemId: team._id.toString(),
                range: {
                  from: moment().startOf('day').format('X'),
                  to: moment().endOf('day').format('X')
                }
              })
              .expect(httpStatus.NOT_FOUND);
          });
        });
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .get('/api/v1/reports/question')
        .query({})
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
