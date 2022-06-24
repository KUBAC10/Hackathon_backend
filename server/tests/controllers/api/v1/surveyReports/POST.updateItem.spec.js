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
  surveyItemFactory, surveyReportItemFactory
} from '../../../../factories';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'test@email.com';
const email2 = 'test2@email.com';

let company;
let team;
let survey;
let surveyReport;
let surveyItem;

async function makeTestData() {
  company = await companyFactory();
  team = await teamFactory({ company });

  survey = await surveyFactory({ company, team });

  surveyReport = await surveyReportFactory({ company, survey, team });

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('## POST /api/v1/survey-reports/:surveyReport/survey-item/:surveyItem', () => {
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

      it('should create new survey report item', async () => {
        surveyItem = await surveyItemFactory({ company, team, survey });

        const res = await agent
          .post(`/api/v1/survey-reports/${surveyReport._id}/survey-item/${surveyItem._id}`)
          .send({
            type: 'segments',
            hide: true
          })
          .expect(httpStatus.OK);

        expect(res.body.hide).to.be.eq(true);
        expect(res.body.surveyReport).to.be.eq(surveyReport._id.toString());
        expect(res.body.surveyItem).to.be.eq(surveyItem._id.toString());
      });

      it('should update existed survey report item', async () => {
        surveyItem = await surveyItemFactory({ company, team, survey });

        await surveyReportItemFactory({
          company,
          surveyReport,
          surveyItem,
          hide: true,
          descriptionShow: true,
          description: 'text',
          chart: 'donut',
          colors: ['#6A9FFF', '#9975FF']
        });

        const res = await agent
          .post(`/api/v1/survey-reports/${surveyReport._id}/survey-item/${surveyItem._id}`)
          .send({
            type: 'surveyReport',
            hide: false,
            descriptionShow: false,
            description: 'hello',
            chart: 'column',
            colors: ['#FE889E', '#FC8D74']
          })
          .expect(httpStatus.OK);

        expect(res.body.hide).to.be.eq(false);
        expect(res.body.chart).to.be.eq('column');
        expect(res.body.colors).to.be.deep.eq(['#FE889E', '#FC8D74']);
        expect(res.body.descriptionShow).to.be.eq(false);
        expect(res.body.description).to.be.eq('hello');
        expect(res.body.surveyReport).to.be.eq(surveyReport._id.toString());
        expect(res.body.surveyItem).to.be.eq(surveyItem._id.toString());
      });

      it('should reject not found', async () => {
        await agent
          .post(`/api/v1/survey-reports/${surveyReport._id}/survey-item/${surveyReport._id}`)
          .send({
            type: 'surveyReport',
            hide: true
          })
          .expect(httpStatus.NOT_FOUND);
      });

      it('should reject by scopes', async () => {
        const surveyItem = await surveyItemFactory({});

        await agent
          .post(`/api/v1/survey-reports/${surveyReport._id}/survey-item/${surveyItem._id}`)
          .send({
            type: 'surveyReport',
            hide: true
          })
          .expect(httpStatus.FORBIDDEN);
      });
    });

    describe('As Team User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });

        surveyItem = await surveyItemFactory({ company, team, survey });
      });

      it('should create new survey report item', async () => {
        surveyItem = await surveyItemFactory({ company, team, survey });

        const res = await agent
          .post(`/api/v1/survey-reports/${surveyReport._id}/survey-item/${surveyItem._id}`)
          .send({
            type: 'surveyReport',
            hide: true
          })
          .expect(httpStatus.OK);

        expect(res.body.hide).to.be.eq(true);
        expect(res.body.surveyReport).to.be.eq(surveyReport._id.toString());
        expect(res.body.surveyItem).to.be.eq(surveyItem._id.toString());
      });

      it('should update existed survey report item', async () => {
        surveyItem = await surveyItemFactory({ company, team, survey });

        await surveyReportItemFactory({
          company,
          surveyReport,
          surveyItem,
          hide: true,
          descriptionShow: true,
          description: 'text',
          chart: 'donut',
          colors: ['#6A9FFF', '#9975FF']
        });

        const res = await agent
          .post(`/api/v1/survey-reports/${surveyReport._id}/survey-item/${surveyItem._id}`)
          .send({
            type: 'surveyReport',
            hide: false,
            descriptionShow: false,
            description: 'hello',
            chart: 'column',
            colors: ['#FE889E', '#FC8D74']
          })
          .expect(httpStatus.OK);

        expect(res.body.hide).to.be.eq(false);
        expect(res.body.chart).to.be.eq('column');
        expect(res.body.colors).to.be.deep.eq(['#FE889E', '#FC8D74']);
        expect(res.body.descriptionShow).to.be.eq(false);
        expect(res.body.description).to.be.eq('hello');
        expect(res.body.surveyReport).to.be.eq(surveyReport._id.toString());
        expect(res.body.surveyItem).to.be.eq(surveyItem._id.toString());
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return unauthorized status', async () => {
      request.agent(app)
        .post(`/api/v1/survey-reports/${surveyReport._id}/survey-item/${surveyItem._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
