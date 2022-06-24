import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';
import moment from 'moment';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  contentFactory,
  surveyFactory
} from 'server/tests/factories';

// services
import { APIMessagesExtractor } from '../../../../../services';

chai.config.includeStack = true;

let survey;
let company;
let content;

async function makeTestData() {
  survey = await surveyFactory({ publicAccess: true });
  company = survey.company;

  // load content
  content = await contentFactory({});
  await APIMessagesExtractor.loadData();
}

describe('## GET /api/v1/surveys/:companyUrlName/:surveyUrlName', () => {
  before(cleanData);

  before(makeTestData);

  it('should return error for wrong company url name', async () => {
    await request(app)
      .get(`/api/v1/surveys/wrongName/${survey.urlName}`)
      .expect(httpStatus.NOT_FOUND);
  });

  it('should return error for wrong survey url name', async () => {
    await request(app)
      .get(`/api/v1/surveys/${company.urlName}/wrongName`)
      .expect(httpStatus.NOT_FOUND);
  });

  it('should return base survey data', async () => {
    const res = await request(app)
      .get(`/api/v1/surveys/${company.urlName}/${survey.urlName}`)
      .expect(httpStatus.OK);
    expect(res.body._id).to.be.eq(survey._id.toString());
    expect(res.body).to.have.all.keys('_id', 'cookiesCheck', 'defaultLanguage', 'description', 'name', 'surveyTheme', 'surveyType', 'translation');
  });

  it('should return message for expired survey', async () => {
    survey = await surveyFactory({
      publicAccess: true,
      startDate: moment().subtract(10, 'days'),
      endDate: moment()
    });
    company = survey.company;

    const res = await request(app)
      .get(`/api/v1/surveys/${company.urlName}/${survey.urlName}`)
      .expect(httpStatus.OK);
    expect(res.body.message).to.be.eq(content.apiMessages.survey.expired);
  });

  it('should return message survey not started', async () => {
    survey = await surveyFactory({
      publicAccess: true,
      startDate: moment().subtract(-10, 'days'),
      endDate: moment().subtract(-20, 'days'),
    });
    company = survey.company;

    const res = await request(app)
      .get(`/api/v1/surveys/${company.urlName}/${survey.urlName}`)
      .expect(httpStatus.OK);
    expect(res.body.message).to.be.eq(content.apiMessages.survey.notStarted);
  });
});
