import chai, { expect } from 'chai';
import moment from 'moment';
import app from '../../..'; // eslint-disable-line

// factories
import {
  companyFactory,
  globalConfigFactory
} from '../factories';

// helpers
import cleanData from '../testHelpers/cleanData';

// models
import { CompanyLimitation } from '../../models';

// cron
import dropLimitations from '../../cron/dropLimitations';

chai.config.includeStack = true;

let limit;
let company;
let defaults;

async function makeTestData() {
  company = await companyFactory({});

  limit = await CompanyLimitation.model.create({ dropAt: moment().subtract(1, 'sec'), company });

  const globalConfig = await globalConfigFactory();

  defaults = globalConfig.companyLimitation;
}

describe('## Drop Limitation Cron Job', () => {
  before(cleanData);

  before(makeTestData);

  it('should drop limits', async () => {
    expect(limit).to.be.an('object');

    Object.keys(defaults).forEach((key) => {
      expect(limit[key]).to.not.eq(defaults[key]);
      expect(limit[key]).to.be.eq(0);
    });

    await dropLimitations();

    limit = await CompanyLimitation.model
      .findOne({ _id: limit._id })
      .lean();

    expect(limit).to.be.an('object');

    Object.keys(defaults).forEach((key) => {
      expect(limit[key]).to.be.eq(defaults[key]);
      expect(limit[key]).to.not.eq(0);
    });
  });
});
