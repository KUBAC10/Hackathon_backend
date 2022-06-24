import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import uuid from 'uuid';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  surveyFactory,
  inviteFactory,
  companyFactory,
  teamFactory
} from '../../../../factories';

chai.config.includeStack = true;

const token = uuid();

let survey;
let company;

async function makeTestData() {
  company = await companyFactory({});
  const team = await teamFactory({ company });

  survey = await surveyFactory({ company, team, publicAccess: true });

  await inviteFactory({ company, team, survey, token });
}

describe('## GET /api/v1/surveys/by-token/:token', () => {
  before(cleanData);

  before(makeTestData);

  it('should return survey base by token', async () => {
    const res = await request(app)
      .get(`/api/v1/surveys/by-token/${token}`)
      .expect(httpStatus.OK);

    expect(res.body._id.toString()).to.be.eq(survey._id.toString());
  });

  it('should return forbidden status if no invite', async () => {
    await request(app)
      .get('/api/v1/surveys/by-token/wrong-token')
      .expect(httpStatus.FORBIDDEN);
  });

  it('should return not found status if survey does not exists', async () => {
    const invite = await inviteFactory({ company, survey: company._id });

    await request(app)
      .get(`/api/v1/surveys/by-token/${invite.token}`)
      .expect(httpStatus.NOT_FOUND);
  });

  it('should return survey id if token is preview', async () => {
    const invite = await inviteFactory({ company, survey, token, preview: true });

    const res = await request(app)
      .get(`/api/v1/surveys/by-token/${invite.token}`)
      .expect(httpStatus.OK);

    expect(res.body._id.toString()).to.be.eq(survey._id.toString());
  });
});
