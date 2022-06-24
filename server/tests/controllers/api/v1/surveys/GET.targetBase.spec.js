import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  surveyFactory,
  companyFactory,
  teamFactory,
  targetFactory
} from '../../../../factories';

chai.config.includeStack = true;

let survey;
let company;
let team;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  survey = await surveyFactory({ company, team });
}

describe('## GET /api/v1/surveys/target/:token', () => {
  before(cleanData);

  before(makeTestData);

  it('should return survey base by target token', async () => {
    const target = await targetFactory({ company, team, survey, status: 'active' });

    const res = await request(app)
      .get(`/api/v1/surveys/${company.urlName}/target/${target.token}`)
      .expect(httpStatus.OK);

    expect(res.body._id.toString()).to.be.eq(survey._id.toString());
    expect(res.body.targetId.toString()).to.be.eq(target._id.toString());
  });

  it('should return forbidden status if no target', async () => {
    await request(app)
      .get(`/api/v1/surveys/${company.urlName}/target/wrongToken`)
      .expect(httpStatus.FORBIDDEN);
  });
});
