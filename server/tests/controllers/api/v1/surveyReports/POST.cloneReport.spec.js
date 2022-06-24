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
  surveyReportItemFactory
} from '../../../../factories';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'test@email.com';
const email2 = 'test2@email.com';

let company;
let survey;
let surveyReport;
let surveyReportItem;

async function makeTestData() {
  company = await companyFactory();
  const team = await teamFactory({ company });

  const survey = await surveyFactory({ company, team });

  surveyReport = await surveyReportFactory({
    company,
    survey,
    team,
    name: 'New Name',
    description: 'New Description',
    lang: 'en',
    liveData: false,
    range: 'custom'
  });

  surveyReportItem = await surveyReportItemFactory({
    surveyReport,
    company,
    team,
    chart: 'donut',
    hide: true
  });

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('## POST /api/v1/survey-reports/:id.clone', () => {
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

      it('should clone survey report and related items', async () => {
        const res = await agent
          .post(`/api/v1/survey-reports/${surveyReport._id}/clone`)
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.not.eq(surveyReport._id.toString());
        expect(res.body.name).to.be.eq('New Name');
        expect(res.body.description).to.be.eq('New Description');
        expect(res.body.lang).to.be.eq('en');
        expect(res.body.range).to.be.eq('custom');
        expect(res.body.surveyReportItems.length).to.be.eq(1);

        const [item] = res.body.surveyReportItems;

        expect(item._id.toString()).to.not.eq(surveyReportItem._id.toString());
        expect(item.surveyItem.toString()).to.be.eq(surveyReportItem.surveyItem._id.toString());
        expect(item.chart).to.be.eq('donut');
        expect(item.hide).to.be.eq(true);
      });

      it('should reject with not found status', async () => {
        await agent
          .post(`/api/v1/survey-reports/${company._id}/clone`)
          .expect(httpStatus.NOT_FOUND);
      });

      it('should reject by scopes', async () => {
        const surveyReport = await surveyReportFactory({ survey });

        await agent
          .post(`/api/v1/survey-reports/${surveyReport._id}/clone`)
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
      });

      it('should clone survey report and related items', async () => {
        const res = await agent
          .post(`/api/v1/survey-reports/${surveyReport._id}/clone`)
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.not.eq(surveyReport._id.toString());
        expect(res.body.name).to.be.eq('New Name');
        expect(res.body.description).to.be.eq('New Description');
        expect(res.body.lang).to.be.eq('en');
        expect(res.body.range).to.be.eq('custom');
        expect(res.body.surveyReportItems.length).to.be.eq(1);

        const [item] = res.body.surveyReportItems;

        expect(item._id.toString()).to.not.eq(surveyReportItem._id.toString());
        expect(item.surveyItem.toString()).to.be.eq(surveyReportItem.surveyItem._id.toString());
        expect(item.chart).to.be.eq('donut');
        expect(item.hide).to.be.eq(true);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return unauthorized status', async () => {
      request.agent(app)
        .post(`/api/v1/survey-reports/${surveyReport._id}/clone`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
