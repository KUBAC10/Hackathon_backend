import moment from 'moment';
import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory,
  teamFactory,
  userFactory,
  surveyFactory,
  surveyReportFactory,
  surveyResultFactory,
  inviteFactory,
  surveyItemFactory,
  questionFactory,
  surveySectionFactory
} from '../../../../factories';

// models
import { Survey } from '../../../../../models';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'test@email.com';

let company;
let team;
let survey;
let question;
let surveyItem;

async function makeTestData() {
  company = await companyFactory();
  team = await teamFactory({ company });

  survey = await surveyFactory({ company, team });

  const surveySection = await surveySectionFactory({ company, team, survey });

  question = await questionFactory({ company, team });
  surveyItem = await surveyItemFactory({ company, team, survey, question, surveySection });

  const answer = { [surveyItem._id]: { value: 'text text text text text text text text text text' } };

  // create surveyResults
  await Promise.all([
    surveyResultFactory({ team, company, survey, empty: false, answer }),
    surveyResultFactory({ team, company, survey, empty: false, completed: true, answer }),
    inviteFactory({ team, company, survey }),
    // entities out range
    surveyResultFactory({ team, company, survey, empty: false, createdAt: moment().subtract(1, 'day'), answer }),
    surveyResultFactory({ team, company, survey, empty: false, completed: true, createdAt: moment().subtract(1, 'day'), answer }),
    inviteFactory({ team, company, survey, createdAt: moment().subtract(1, 'day') }),
  ]);

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });
}

describe('## GET /api/v1/survey-reports/data', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    const agent = request.agent(app);
    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          login: email,
          password
        });
    });

    it('should return survey report data by range', async () => {
      const surveyReport = await surveyReportFactory({ company, team, survey, range: 'today' });

      const res = await agent
        .get('/api/v1/survey-reports/data')
        .query({
          survey: survey._id.toString(),
          reportId: surveyReport._id.toString()
        })
        .expect(httpStatus.OK);

      expect(res.body._id.toString()).to.be.eq(surveyReport._id.toString());
      expect(res.body.default).to.be.eq(false);

      // survey stats
      expect(res.body.surveyStats.total).to.be.eq(2);
      expect(res.body.surveyStats.totalInvites).to.be.eq(1);
      expect(res.body.surveyStats.completedPercentage).to.be.eq(50);

      // reports
      expect(res.body.reports.length).to.be.eq(1);

      const [report] = res.body.reports;

      expect(report._id.toString()).to.be.eq(surveyItem._id.toString());
      expect(report.question._id.toString()).to.be.eq(question._id.toString());
      expect(report.question.surveyItem.toString()).to.be.eq(surveyItem._id.toString());
      expect(report.question.type).to.be.eq('text');
      expect(report.data.find(d => d.text === 'text').value).to.be.eq(20);
    });

    it('should return default survey report data', async () => {
      const res = await agent
        .get('/api/v1/survey-reports/data')
        .query({
          survey: survey._id.toString()
        })
        .expect(httpStatus.OK);

      expect(res.body.default).to.be.eq(true);
    });

    it('should return segments data', async () => {
      const surveyReport = await surveyReportFactory({
        company,
        team,
        survey,
        range: 'today',
        segments: { answers: [{}] }
      });

      const res = await agent
        .get('/api/v1/survey-reports/data')
        .query({
          survey: survey._id.toString(),
          reportId: surveyReport._id.toString()
        })
        .expect(httpStatus.OK);

      expect(res.body.segmentResults).to.be.an('array');
    });

    it('should return correct reports and segment results', async () => {
      const surveyReport = await surveyReportFactory({
        company,
        team,
        survey,
        range: 'today',
        segments: { answers: [{}] }
      });

      const res = await agent
        .get('/api/v1/survey-reports/data')
        .query({
          survey: survey._id.toString(),
          reportId: surveyReport._id.toString()
        })
        .expect(httpStatus.OK);

      expect(res.body.reports.length).to.be.eq(1);
      expect(res.body.segmentResults.length).to.be.eq(1);
    });

    it('should return forbidden status', async () => {
      const surveyReport = await surveyReportFactory({ survey });

      await agent
        .get('/api/v1/survey-reports/data')
        .query({
          survey: survey._id.toString(),
          reportId: surveyReport._id.toString()
        })
        .expect(httpStatus.FORBIDDEN);
    });

    it('should reject not found', async () => {
      const surveyReport = await surveyReportFactory({ survey });

      await agent
        .get('/api/v1/survey-reports/data')
        .query({
          survey: surveyReport._id.toString(),
          reportId: surveyReport._id.toString()
        })
        .expect(httpStatus.NOT_FOUND);
    });

    it('should reject if no survey', async () => {
      await Survey.model.remove({ _id: survey._id });

      await agent
        .get('/api/v1/survey-reports/data')
        .query({
          survey: survey._id.toString(),
          reportId: survey._id.toString()
        })
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('Unauthorized', () => {
    it('should return unauthorized status', async () => {
      request.agent(app)
        .get('/api/v1/survey-reports/data')
        .query({
          survey: survey._id.toString()
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
