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
  teamUserFactory,
  surveyFactory,
  surveyReportFactory,
  surveyItemFactory,
  surveyReportItemFactory,
  surveyResultFactory
} from '../../../../factories';

// models
import { SurveyReportItem } from '../../../../../models';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'test@email.com';
const email2 = 'test2@email.com';

let company;
let team;
let surveyReport;
let surveyItemText;
let surveyItemCustom;

async function makeTestData() {
  company = await companyFactory();
  team = await teamFactory({ company });

  const survey = await surveyFactory({ team, company });

  surveyReport = await surveyReportFactory({ team, company, survey });

  [
    surveyItemText,
    surveyItemCustom
  ] = await Promise.all([
    surveyItemFactory({ team, company, survey }),
    surveyItemFactory({ team, company, survey })
  ]);

  await Promise.all([
    surveyResultFactory({ team, company, survey, empty: false }),
    surveyResultFactory({ team, company, survey, answer: { [surveyItemText._id]: { value: 'text' } }, empty: false }),
    surveyResultFactory({ team, company, survey, answer: { [surveyItemText._id]: { value: 'text' } }, empty: false }),
    surveyResultFactory({ team, company, survey, answer: { [surveyItemText._id]: { value: 'text' } }, empty: false }),
    surveyResultFactory({ team, company, survey, answer: { [surveyItemCustom._id]: { customAnswer: 'customAnswer' } }, empty: false }),
    surveyResultFactory({ team, company, survey, answer: { [surveyItemCustom._id]: { customAnswer: 'customAnswer' } }, empty: false }),
    surveyResultFactory({ team, company, survey, answer: { [surveyItemCustom._id]: { customAnswer: 'customAnswer' } }, empty: false })
  ]);

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('## POST /api/v1/survey-reports/:id/get-text-answers-list', () => {
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

      it('should return list of text answers and update report item', async () => {
        await surveyReportItemFactory({ company, team, surveyReport, surveyItem: surveyItemText });

        const res = await agent
          .post(`/api/v1/survey-reports/${surveyReport._id}/get-text-answers-list`)
          .send({
            surveyItemId: surveyItemText._id,
            type: 'report',
            field: 'value',
            skip: 0,
            limit: 25
          })
          .expect(httpStatus.OK);

        const reportItem = await SurveyReportItem.model.findOne({
          company: surveyReport.company,
          surveyReport: surveyReport._id,
          surveyItem: surveyItemText._id,
          type: 'surveyReport'
        });

        expect(reportItem).to.be.an('object');
        expect(reportItem.skip).to.be.eq(0);
        expect(reportItem.limit).to.be.eq(25);

        expect(res.body.resources.length).to.be.eq(3);
        expect(res.body.total).to.be.eq(3);

        await reportItem.remove();
      });

      it('should return list of text answers and create report item', async () => {
        const res = await agent
          .post(`/api/v1/survey-reports/${surveyReport._id}/get-text-answers-list`)
          .send({
            surveyItemId: surveyItemText._id,
            type: 'report',
            field: 'value',
            skip: 0,
            limit: 25
          })
          .expect(httpStatus.OK);

        const reportItem = await SurveyReportItem.model.findOne({
          company: surveyReport.company,
          surveyReport: surveyReport._id,
          surveyItem: surveyItemText._id,
          type: 'surveyReport'
        });

        expect(reportItem).to.be.an('object');
        expect(reportItem.skip).to.be.eq(0);
        expect(reportItem.limit).to.be.eq(25);

        expect(res.body.resources.length).to.be.eq(3);
        expect(res.body.total).to.be.eq(3);

        await reportItem.remove();
      });

      it('should return list of custom answers and create report item', async () => {
        const res = await agent
          .post(`/api/v1/survey-reports/${surveyReport._id}/get-text-answers-list`)
          .send({
            surveyItemId: surveyItemCustom._id,
            type: 'report',
            field: 'customAnswer',
            skip: 0,
            limit: 25
          })
          .expect(httpStatus.OK);

        const reportItem = await SurveyReportItem.model.findOne({
          company: surveyReport.company,
          surveyReport: surveyReport._id,
          surveyItem: surveyItemCustom._id,
          type: 'surveyReport'
        });

        expect(reportItem).to.be.an('object');
        expect(reportItem.skip).to.be.eq(0);
        expect(reportItem.limit).to.be.eq(25);

        expect(res.body.resources.length).to.be.eq(3);
        expect(res.body.total).to.be.eq(3);

        await reportItem.remove();
      });

      it('should reject not found', async () => {
        await agent
          .post(`/api/v1/survey-reports/${company._id}/get-text-answers-list`)
          .send({
            surveyItemId: surveyItemText._id,
            type: 'report',
            field: 'value',
            skip: 0,
            limit: 25
          })
          .expect(httpStatus.NOT_FOUND);
      });

      it('should reject by scopes', async () => {
        const surveyReport = await surveyReportFactory({});

        await agent
          .post(`/api/v1/survey-reports/${surveyReport._id}/get-text-answers-list`)
          .send({
            surveyItemId: surveyItemText._id,
            type: 'report',
            field: 'value',
            skip: 0,
            limit: 25
          })
          .expect(httpStatus.FORBIDDEN);
      });
    });

    describe(' As Team User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should return list of text answers and update report item', async () => {
        await surveyReportItemFactory({ company, team, surveyReport, surveyItem: surveyItemText });

        const res = await agent
          .post(`/api/v1/survey-reports/${surveyReport._id}/get-text-answers-list`)
          .send({
            surveyItemId: surveyItemText._id,
            type: 'report',
            field: 'value',
            skip: 0,
            limit: 25
          })
          .expect(httpStatus.OK);

        const reportItem = await SurveyReportItem.model.findOne({
          company: surveyReport.company,
          surveyReport: surveyReport._id,
          surveyItem: surveyItemText._id,
          type: 'surveyReport'
        });

        expect(reportItem).to.be.an('object');
        expect(reportItem.skip).to.be.eq(0);
        expect(reportItem.limit).to.be.eq(25);

        expect(res.body.resources.length).to.be.eq(3);
        expect(res.body.total).to.be.eq(3);

        await reportItem.remove();
      });

      it('should return list of text answers and create report item', async () => {
        const res = await agent
          .post(`/api/v1/survey-reports/${surveyReport._id}/get-text-answers-list`)
          .send({
            surveyItemId: surveyItemText._id,
            type: 'report',
            field: 'value',
            skip: 0,
            limit: 25
          })
          .expect(httpStatus.OK);

        const reportItem = await SurveyReportItem.model.findOne({
          company: surveyReport.company,
          surveyReport: surveyReport._id,
          surveyItem: surveyItemText._id,
          type: 'surveyReport'
        });

        expect(reportItem).to.be.an('object');
        expect(reportItem.skip).to.be.eq(0);
        expect(reportItem.limit).to.be.eq(25);

        expect(res.body.resources.length).to.be.eq(3);
        expect(res.body.total).to.be.eq(3);

        await reportItem.remove();
      });

      it('should return list of custom answers and create report item', async () => {
        const res = await agent
          .post(`/api/v1/survey-reports/${surveyReport._id}/get-text-answers-list`)
          .send({
            surveyItemId: surveyItemCustom._id,
            type: 'report',
            field: 'customAnswer',
            skip: 0,
            limit: 25
          })
          .expect(httpStatus.OK);

        const reportItem = await SurveyReportItem.model.findOne({
          company: surveyReport.company,
          surveyReport: surveyReport._id,
          surveyItem: surveyItemCustom._id,
          type: 'surveyReport'
        });

        expect(reportItem).to.be.an('object');
        expect(reportItem.skip).to.be.eq(0);
        expect(reportItem.limit).to.be.eq(25);

        expect(res.body.resources.length).to.be.eq(3);
        expect(res.body.total).to.be.eq(3);

        await reportItem.remove();
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return unauthorized status', async () => {
      await request(app)
        .post(`/api/v1/survey-reports/${surveyReport._id}/get-text-answers-list`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
