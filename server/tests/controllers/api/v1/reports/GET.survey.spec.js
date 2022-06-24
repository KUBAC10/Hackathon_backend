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
  teamUserFactory,
  assetFactory,
  surveySectionFactory
} from 'server/tests/factories';

import { SurveyResult } from 'server/models';

chai.config.includeStack = true;

let team;
let team2;
let company;
let survey;
let teamUser;
let teamUser2;
const password = 'qwe123qwe';
const email = 'test@email.com';
const email2 = 'test2@email.com';
const email3 = 'test3@email.com';
const selectionType = [
  'overall',
  'summary',
  'perDay',
];

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });
  team2 = await teamFactory({ company });
  survey = await surveyFactory({ company, team });
  const question = await questionFactory({});
  await surveyItemFactory({ survey, question });

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

describe('## GET /api/v1/reports/survey', () => {
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

      selectionType.forEach((type) => {
        let asset1;
        let asset2;
        let survey;
        let question;

        describe(`For ${type} type`, () => {
          before(async () => {
            [
              asset1,
              asset2,
              survey,
              question
            ] = await Promise.all([
              assetFactory({ company, team }),
              assetFactory({ company, team }),
              surveyFactory({ company, team }),
              questionFactory({ company, team })
            ]);

            // create survey section
            const surveySection = await surveySectionFactory({ survey });

            await surveyItemFactory({ survey, surveySection, question });
            await surveyResultFactory({
              survey,
              assets: [asset1._id, asset2._id]
            });
          });

          it('should return valid data', async () => {
            const res = await agent
              .get('/api/v1/reports/survey')
              .query({
                surveyId: survey._id.toString(),
                [type]: true
              })
              .expect(httpStatus.OK);

            expect(res.body.reports.length).to.be.eq(1);
            expect(res.body.survey._id).to.be.eq(survey._id.toString());
            expect(res.body.reports[0].question._id).to.be.eq(question._id.toString());
          });

          it('should return valid data with assets', async () => {
            const res = await agent
              .get('/api/v1/reports/survey')
              .query({
                surveyId: survey._id.toString(),
                [type]: true,
                assets: [asset1._id.toString(), asset2._id.toString()]
              })
              .expect(httpStatus.OK);

            expect(res.body.reports.length).to.be.eq(1);
            expect(res.body.survey._id).to.be.eq(survey._id.toString());
            expect(res.body.reports[0].question._id).to.be.eq(question._id.toString());
          });
        });
      });

      describe('stats', () => {
        it('should return stats data', async () => {
          const res = await agent
            .get('/api/v1/reports/survey-stats')
            .query({ surveyId: survey._id.toString() })
            .expect(httpStatus.OK);

          const surveyResultCount = await SurveyResult.model
            .findOne({ survey: survey._id })
            .countDocuments();

          expect(res.body.total).to.be.eq(0);
          expect(surveyResultCount).to.be.eq(1);
        });
      });

      describe('by range', () => {
        it('should return stats data', async () => {
          const res = await agent
            .get('/api/v1/reports/survey')
            .query({
              surveyId: survey._id.toString(),
              from: moment().startOf('day').format('X'),
              to: moment().endOf('day').format('X')
            })
            .expect(httpStatus.OK);
          expect(res.body).to.be.an('Object');
          expect(res.body.survey._id).to.be.eq(survey._id.toString());
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

        selectionType.forEach((type) => {
          let asset1;
          let asset2;
          let survey;
          let question;

          describe(`For ${type} type`, () => {
            before(async () => {
              [
                asset1,
                asset2,
                survey,
                question
              ] = await Promise.all([
                assetFactory({ company, team }),
                assetFactory({ company, team }),
                surveyFactory({ company, team }),
                questionFactory({ company, team })
              ]);

              // create survey section
              const surveySection = await surveySectionFactory({ survey });

              await surveyItemFactory({ survey, surveySection, question });
              await surveyResultFactory({
                survey,
                assets: [asset1._id, asset2._id]
              });
            });

            it('should return valid data', async () => {
              const res = await agent
                .get('/api/v1/reports/survey')
                .query({
                  surveyId: survey._id.toString(),
                  [type]: true
                })
                .expect(httpStatus.OK);

              expect(res.body.reports.length).to.be.eq(1);
              expect(res.body.survey._id).to.be.eq(survey._id.toString());
              expect(res.body.reports[0].question._id).to.be.eq(question._id.toString());
            });

            it('should return valid data with assets', async () => {
              const res = await agent
                .get('/api/v1/reports/survey')
                .query({
                  surveyId: survey._id.toString(),
                  [type]: true,
                  assets: [asset1._id.toString(), asset2._id.toString()]
                })
                .expect(httpStatus.OK);

              expect(res.body.reports.length).to.be.eq(1);
              expect(res.body.survey._id).to.be.eq(survey._id.toString());
              expect(res.body.reports[0].question._id).to.be.eq(question._id.toString());
            });
          });
        });

        describe('stats', () => {
          it('should return stats data', async () => {
            const res = await agent
              .get('/api/v1/reports/survey-stats')
              .query({ surveyId: survey._id.toString()
              })
              .expect(httpStatus.OK);

            const surveyResultCount = await SurveyResult.model
              .findOne({ survey: survey._id })
              .countDocuments();

            expect(res.body.total).to.be.eq(0);
            expect(surveyResultCount).to.be.eq(1);
          });
        });

        describe('by range', () => {
          it('should return data by range', async () => {
            const res = await agent
              .get('/api/v1/reports/survey')
              .query({
                surveyId: survey._id.toString(),
                range: {
                  from: moment().startOf('day').format('X'),
                  to: moment().endOf('day').format('X')
                }
              })
              .expect(httpStatus.OK);
            expect(res.body).to.be.an('Object');
            expect(res.body.survey._id).to.be.eq(survey._id.toString());
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

        selectionType.forEach((type) => {
          let asset1;
          let asset2;
          let survey;
          let question;

          describe(`For ${type} type`, () => {
            before(async () => {
              [
                asset1,
                asset2,
                survey,
                question
              ] = await Promise.all([
                assetFactory({ company, team }),
                assetFactory({ company, team }),
                surveyFactory({ company, team }),
                questionFactory({ company, team })
              ]);
              await surveyItemFactory({ survey, question });
              await surveyResultFactory({
                survey,
                assets: [asset1._id, asset2._id]
              });
            });

            it('should return valid data', async () => {
              await agent
                .get('/api/v1/reports/survey')
                .query({
                  surveyId: survey._id.toString(),
                  [type]: true
                })
                .expect(httpStatus.FORBIDDEN);
            });

            it('should return valid data with assets', async () => {
              await agent
                .get('/api/v1/reports/survey')
                .query({
                  surveyId: survey._id.toString(),
                  [type]: true,
                  assets: [asset1._id.toString(), asset2._id.toString()]
                })
                .expect(httpStatus.FORBIDDEN);
            });

            it('should return not found data with assets', async () => {
              await agent
                .get('/api/v1/reports/survey')
                .query({
                  surveyId: company._id.toString(),
                  [type]: true,
                  assets: [asset1._id.toString(), asset2._id.toString()]
                })
                .expect(httpStatus.NOT_FOUND);
            });
          });
        });

        describe('stats', () => {
          it('should not return data', async () => {
            await agent
              .get('/api/v1/reports/survey')
              .query({
                surveyId: survey._id.toString(),
                stats: true
              })
              .expect(httpStatus.FORBIDDEN);
          });
        });

        describe('by range', () => {
          it('should not return data', async () => {
            await agent
              .get('/api/v1/reports/survey')
              .query({
                surveyId: survey._id.toString(),
                from: moment().startOf('day').format('X'),
                to: moment().endOf('day').format('X')
              })
              .expect(httpStatus.FORBIDDEN);
          });

          it('should return found data', async () => {
            await agent
              .get('/api/v1/reports/survey')
              .query({
                surveyId: company._id.toString(),
                from: moment().startOf('day').format('X'),
                to: moment().endOf('day').format('X')
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
        .get('/api/v1/reports/survey')
        .query({})
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
