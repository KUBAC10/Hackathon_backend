import uuid from 'uuid';
import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from '../../../../../../index';

// factories
import {
  companyFactory,
  pulseSurveyRecipientFactory,
  pulseSurveyRoundResultFactory,
  surveyCampaignFactory,
  teamFactory
} from '../../../../factories';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

// models
import { PulseSurveyRecipient } from '../../../../../models';

chai.config.includeStack = true;

let surveyCampaign;

async function makeTestData() {
  const company = await companyFactory({});
  const team = await teamFactory({ company });

  // create survey campaign
  surveyCampaign = await surveyCampaignFactory({ company, team });
}

describe('# GET ', () => {
  before(cleanData);

  before(makeTestData);

  it('should unsubscribe survey pulse recipient', async () => {
    const token = uuid();

    const recipient = await pulseSurveyRecipientFactory({ surveyCampaign });

    await pulseSurveyRoundResultFactory({ recipient, token, surveyCampaign });

    await request(app)
      .get(`/api/v1/distribute/unsubscribe/${token}`)
      .expect(httpStatus.OK);

    const reloadRecipient = await PulseSurveyRecipient.model.findById(recipient._id).lean();

    expect(reloadRecipient.unsubscribe).to.be.eq(true);
  });
});
