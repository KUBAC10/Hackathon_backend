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

// models
import { Invite } from '../../../../../models';

// config
import config from '../../../../../../config/env';

chai.config.includeStack = true;

let company;
let team;
let survey;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });
}

describe('## GET /api/v1/surveys/:id/public-template-link - return public template', () => {
  before(cleanData);

  before(makeTestData);

  it('should reject with not found status', async () => {
    survey = await surveyFactory({ company, team });

    await request(app)
      .get(`/api/v1/surveys/${survey._id}/public-template-link`)
      .expect(httpStatus.NOT_FOUND);
  });

  it('should reject with forbidden status', async () => {
    survey = await surveyFactory({ company, team, type: 'template' });

    await request(app)
      .get(`/api/v1/surveys/${survey._id}/public-template-link`)
      .expect(httpStatus.FORBIDDEN);
  });

  it('should return link for public preview survey', async () => {
    survey = await surveyFactory({ company, team, type: 'template', publicPreview: true });

    const res = await request(app)
      .get(`/api/v1/surveys/${survey._id}/public-template-link`)
      .expect(httpStatus.OK);

    const invite = await Invite.model
      .findOne({ survey: survey._id, preview: true })
      .lean();

    expect(invite).to.be.an('object');
    expect(res.body.link).to.be.eq(`${config.hostname}/survey?token=${invite.token}`);
  });
});
