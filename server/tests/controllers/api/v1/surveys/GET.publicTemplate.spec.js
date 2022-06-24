import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

// factories
import {
  companyFactory,
  surveyFactory,
  teamFactory
} from '../../../../factories';

chai.config.includeStack = true;

let company;
let team;
let survey;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });
}

describe('## GET /api/v1/surveys/:id/public-template - return public template ', () => {
  before(cleanData);

  before(makeTestData);

  it('should reject with not found status', async () => {
    survey = await surveyFactory({ company, team });

    await request(app)
      .get(`/api/v1/surveys/${survey._id}/public-template`)
      .expect(httpStatus.NOT_FOUND);
  });

  it('should reject with forbidden status', async () => {
    survey = await surveyFactory({ company, team, type: 'template' });

    await request(app)
      .get(`/api/v1/surveys/${survey._id}/public-template`)
      .expect(httpStatus.FORBIDDEN);
  });

  it('should return public preview survey', async () => {
    survey = await surveyFactory({ company, team, type: 'template', publicPreview: true });

    const res = await request(app)
      .get(`/api/v1/surveys/${survey._id}/public-template`)
      .expect(httpStatus.OK);

    expect(res.body._id.toString()).to.be.eq(survey._id.toString());
  });
});
