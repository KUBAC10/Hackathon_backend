import moment from 'moment';
import chai, { expect } from 'chai';
import app from '../../..'; // eslint-disable-line

// factories
import {
  companyFactory,
  surveyCampaignFactory,
  surveyFactory
} from '../factories';

// helpers
import cleanData from '../testHelpers/cleanData';

// models
import { CompanyLimitation } from '../../models';

// cron
import distribute from '../../cron/distribute';

chai.config.includeStack = true;

let limit;
let company;

async function makeTestData() {
  company = await companyFactory({});
  const team = await companyFactory({ company });

  const survey = await surveyFactory({ company, team });

  await surveyCampaignFactory({
    company,
    status: 'active',
    emails: ['qwe1@qwe.qwe'],
    survey,
    fireTime: moment().subtract(1, 'minute')
  });

  limit = await CompanyLimitation.model.create({ invites: 2, company });
}

describe('## Distribute invites limits', () => {
  before(cleanData);

  before(makeTestData);

  it('should decrement invites limit', async () => {
    await distribute();

    limit = await CompanyLimitation.model.findOne({ _id: limit._id }).lean();

    expect(limit.invites).to.be.eq(1);
  });
});
