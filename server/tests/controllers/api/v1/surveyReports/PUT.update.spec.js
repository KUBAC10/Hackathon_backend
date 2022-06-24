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
  surveyReportFactory
} from '../../../../factories';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'test@email.com';
const email2 = 'test2@email.com';

let company;
let surveyReport;

async function makeTestData() {
  company = await companyFactory();
  const team = await teamFactory({ company });

  const survey = await surveyFactory({ company, team });

  surveyReport = await surveyReportFactory({ company, survey, team });

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('## PUT /api/v1/survey-reports/:id', () => {
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

      it('should update new survey report', async () => {
        const res = await agent
          .put(`/api/v1/survey-reports/${surveyReport._id}`)
          .send({
            name: 'New Name',
            description: 'New Description',
            lang: 'en',
            range: 'custom',
            hideCoverPage: true
          })
          .expect(httpStatus.OK);

        expect(res.body.name).to.be.eq('New Name');
        expect(res.body.description).to.be.eq('New Description');
        expect(res.body.lang).to.be.eq('en');
        expect(res.body.range).to.be.eq('custom');
        expect(res.body.hideCoverPage).to.be.eq(true);
      });

      it('should reject with not found status', async () => {
        await agent
          .put(`/api/v1/survey-reports/${company._id}`)
          .send({
            name: 'New Name',
            description: 'New Description',
            lang: 'en',
            liveData: false,
            range: 'custom',
            hideCoverPage: true
          })
          .expect(httpStatus.NOT_FOUND);
      });

      it('should reject by scopes', async () => {
        const surveyReport = await surveyReportFactory({});

        await agent
          .put(`/api/v1/survey-reports/${surveyReport._id}`)
          .send({
            name: 'New Name',
            description: 'New Description',
            lang: 'en',
            liveData: false,
            range: 'custom',
            hideCoverPage: true
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
      });

      it('should update new survey report', async () => {
        const res = await agent
          .put(`/api/v1/survey-reports/${surveyReport._id}`)
          .send({
            name: 'New Name',
            description: 'New Description',
            lang: 'en',
            range: 'custom'
          })
          .expect(httpStatus.OK);

        expect(res.body.name).to.be.eq('New Name');
        expect(res.body.description).to.be.eq('New Description');
        expect(res.body.lang).to.be.eq('en');
        expect(res.body.range).to.be.eq('custom');
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return unauthorized status', async () => {
      request.agent(app)
        .put(`/api/v1/survey-reports/${surveyReport._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
