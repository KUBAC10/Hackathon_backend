import request from 'supertest';
import moment from 'moment';
import chai, { expect } from 'chai';
import app from 'index';
import openSocket from 'socket.io-client';
import config from '../../../config/env/';

// helpers
import cleanData from '../testHelpers/cleanData';

// factories
import {
  userFactory,
  companyFactory,
  teamFactory,
  surveyFactory,
  teamUserFactory,
  questionFactory,
  surveyReportFactory,
  surveyItemFactory
} from '../factories/';

// services
import { ReportsListener } from '../../services';

chai.config.includeStack = true;

let cookie;

let company;
let team;
let team2;
let survey;
let question;
let teamUser;
let anotherTeamUser;
let surveyReport;
let surveyItem;

const password = 'qwe123qwe';
const email = 'test@email.com';
const email2 = 'testt@email.com';
const email3 = 'testtt@email.com';

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });
  team2 = await teamFactory({ company });
  survey = await surveyFactory({ company, team });
  question = await questionFactory({ team, company });
  surveyReport = await surveyReportFactory({ team, company, survey });
  surveyItem = await surveyItemFactory({ team, company, survey, question });
  // create Power user
  await userFactory({ email, password, company, isPowerUser: true });

  // create Team user
  teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ team, user: teamUser, company });

  // create user from another team
  anotherTeamUser = await userFactory({ email: email3, password, company, currentTeam: team2 });
  await teamUserFactory({ team2, user: anotherTeamUser, company });
}

describe('## GET /api/v1/reports/survey', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('as Power User', () => {
      before(async () => {
        const agent = request.agent(app);
        const res = await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
        cookie = res.headers['set-cookie'][0];
      });

      describe('LiveData', () => {
        it('should connect socket to analyze room and set queries to redis', (done) => {
          const socket = openSocket(`http://localhost:${config.port}`, {
            extraHeaders: { cookie } // to pass socket access middleware
          });

          socket.emit('analyze', {
            surveyId: survey._id,
            queries: {
              repliesQuery: {
                from: moment().subtract(1, 'week'),
                to: moment()
              }
            }
          });

          socket.on('replies#data', (data) => {
            expect(data).to.be.an('object');
            socket.disconnect();
            done();
          });

          setTimeout(() => {
            ReportsListener.liveData(survey._id.toString(), [surveyItem]);
          }, 1000);
        });

        it('should connect socket to surveyReport room and set keys to redis', (done) => {
          const socket = openSocket(`http://localhost:${config.port}`, {
            extraHeaders: { cookie } // to pass socket access middleware
          });

          socket.emit('surveyReport', {
            surveyId: survey._id,
            surveyReportId: surveyReport._id
          });

          socket.on(`surveyReports#${survey._id}#${surveyReport._id}`, (data) => {
            expect(data).to.be.an('object');
            socket.disconnect();
            done();
          });

          setTimeout(() => {
            ReportsListener.liveData(survey._id.toString(), [surveyItem]);
          }, 1000);
        });

        it('should connect socket to surveyResults room and set keys to redis', (done) => {
          const socket = openSocket(`http://localhost:${config.port}`, {
            extraHeaders: { cookie } // to pass socket access middleware
          });

          socket.emit('surveyResults', {
            surveyId: survey._id
          });

          socket.on(`surveyResults#${survey._id}`, (data) => {
            expect(data).to.be.an('object');
            socket.disconnect();
            done();
          });

          setTimeout(() => {
            ReportsListener.liveData(survey._id.toString(), [surveyItem]);
          }, 1000);
        });

        it('should disconnect analyze socket and clear redis data', (done) => {
          const socket = openSocket(`http://localhost:${config.port}`, {
            extraHeaders: { cookie } // to pass socket access middleware
          });

          socket.emit('analyze', {
            surveyId: survey._id,
            queries: {
              repliesQuery: {
                from: moment().subtract(1, 'week').format('DD/MM/YYYY'),
                to: moment().format('DD/MM/YYYY')
              }
            }
          });

          setTimeout(() => {
            socket.disconnect();
            done();
          }, 1000);
        });

        it('should disconnect surveyReport socket and clear redis data', (done) => {
          const socket = openSocket(`http://localhost:${config.port}`, {
            extraHeaders: { cookie } // to pass socket access middleware
          });

          socket.emit('surveyReport', {
            surveyId: survey._id,
            surveyReportId: surveyReport._id
          });

          setTimeout(() => {
            socket.disconnect();
            done();
          }, 1000);
        });

        it('should disconnect socket for incorrect surveyId', (done) => {
          const socket = openSocket(`http://localhost:${config.port}`, {
            extraHeaders: {
              cookie
            }
          });
          socket.emit('surveyReport', { surveyId: team._id.toString() });
          socket.on('disconnect', (msg) => {
            expect(msg).to.be.eq('io server disconnect');
            done();
          });
        });

        it('should reject for wrong cookie', (done) => {
          const socket = openSocket(`http://localhost:${config.port}`, {
            transportOptions: {
              polling: {
                extraHeaders: {
                  cookie: 'wrong cookie'
                }
              }
            }
          });
          socket.emit('surveyReport', { surveyId: team._id.toString() });
          socket.on('connect_error', (err) => {
            expect(err.message).to.be.eq('Wrong cookie');
            socket.disconnect();
            done();
          });
        });
      });
    });

    describe('as Team User', () => {
      const agent = request.agent(app);
      before(async () => {
        const res = await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
        cookie = res.headers['set-cookie'][0];
      });

      describe('LiveData', () => {
        it('should connect socket to analyze room and set queries to redis', (done) => {
          const socket = openSocket(`http://localhost:${config.port}`, {
            extraHeaders: { cookie } // to pass socket access middleware
          });

          socket.emit('analyze', {
            surveyId: survey._id,
            queries: {
              repliesQuery: {
                from: moment().subtract(1, 'week'),
                to: moment()
              }
            }
          });

          socket.on('replies#data', (data) => {
            expect(data).to.be.an('object');
            socket.disconnect();
            done();
          });

          setTimeout(() => {
            ReportsListener.liveData(survey._id.toString(), [surveyItem]);
          }, 1000);
        });

        it('should connect socket to surveyReport room and set keys to redis', (done) => {
          const socket = openSocket(`http://localhost:${config.port}`, {
            extraHeaders: { cookie } // to pass socket access middleware
          });

          socket.emit('surveyReport', {
            surveyId: survey._id,
            surveyReportId: surveyReport._id
          });

          socket.on(`surveyReports#${survey._id}#${surveyReport._id}`, (data) => {
            expect(data).to.be.an('object');
            socket.disconnect();
            done();
          });

          setTimeout(() => {
            ReportsListener.liveData(survey._id.toString(), [surveyItem]);
          }, 1000);
        });

        it('should connect socket to surveyResults room and set keys to redis', (done) => {
          const socket = openSocket(`http://localhost:${config.port}`, {
            extraHeaders: { cookie } // to pass socket access middleware
          });

          socket.emit('surveyResults', {
            surveyId: survey._id
          });

          socket.on(`surveyResults#${survey._id}`, (data) => {
            expect(data).to.be.an('object');
            socket.disconnect();
            done();
          });

          setTimeout(() => {
            ReportsListener.liveData(survey._id.toString(), [surveyItem]);
          }, 1000);
        });

        it('should disconnect analyze socket and clear redis data', (done) => {
          const socket = openSocket(`http://localhost:${config.port}`, {
            extraHeaders: { cookie } // to pass socket access middleware
          });

          socket.emit('analyze', {
            surveyId: survey._id,
            queries: {
              repliesQuery: {
                from: moment().subtract(1, 'week').format('DD/MM/YYYY'),
                to: moment().format('DD/MM/YYYY')
              }
            }
          });

          setTimeout(() => {
            socket.disconnect();
            done();
          }, 500);
        });

        it('should disconnect surveyReport socket and clear redis data', (done) => {
          const socket = openSocket(`http://localhost:${config.port}`, {
            extraHeaders: { cookie } // to pass socket access middleware
          });

          socket.emit('surveyReport', {
            surveyId: survey._id,
            surveyReportId: surveyReport._id
          });

          setTimeout(() => {
            socket.disconnect();
            done();
          }, 500);
        });

        it('should disconnect socket for incorrect surveyId', (done) => {
          const socket = openSocket(`http://localhost:${config.port}`, {
            extraHeaders: {
              cookie
            }
          });
          socket.emit('surveyReport', { surveyId: team._id.toString() });
          socket.on('disconnect', (msg) => {
            expect(msg).to.be.eq('io server disconnect');
            done();
          });
        });

        it('should reject for wrong cookie', (done) => {
          const socket = openSocket(`http://localhost:${config.port}`, {
            transportOptions: {
              polling: {
                extraHeaders: {
                  cookie: 'wrong cookie'
                }
              }
            }
          });
          socket.emit('surveyReport', { surveyId: team._id.toString() });
          socket.on('connect_error', (err) => {
            expect(err.message).to.be.eq('Wrong cookie');
            socket.disconnect();
            done();
          });
        });
      });
    });

    describe('as user from another team', () => {
      const agent = request.agent(app);
      before(async () => {
        const res = await agent
          .post('/api/v1/authentication')
          .send({
            login: email3,
            password
          });
        cookie = res.headers['set-cookie'][0];
      });

      it('should disconnect socket', (done) => {
        const socket = openSocket(`http://localhost:${config.port}`, {
          transportOptions: {
            polling: {
              extraHeaders: {
                cookie
              }
            }
          }
        });
        socket.emit('analyze', ({ surveyId: survey._id }));
        socket.on('disconnect', (msg) => {
          expect(msg).to.be.eq('io server disconnect');
          done();
        });
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return error for unauthorized user', (done) => {
      const socket = openSocket(`http://localhost:${config.port}`);
      socket.emit('analyze', ({ surveyId: survey._id }));
      socket.on('connect_error', (err) => {
        expect(err.message).to.be.eq('Unauthorized');
        done();
      });
    });
  });
});
