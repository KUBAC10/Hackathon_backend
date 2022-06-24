import chai, { expect } from 'chai';
import moment from 'moment';
import app from '../../..'; // eslint-disable-line

// helpers
import cleanData from '../testHelpers/cleanData';

// factories
import {
  surveyCampaignFactory,
  surveyReportFactory,
} from '../factories';

// cron
import autoReportsMailing from '../../cron/autoReportsMailing';

// models
import { SurveyCampaign } from '../../models';

chai.config.includeStack = true;

let surveyCampaign;

async function makeTestData() {
  const surveyReport = await surveyReportFactory({});

  surveyCampaign = await surveyCampaignFactory({
    surveyReport,
    frequency: 'everyDay',
    reportsMailing: true,
    status: 'active',
    fireTime: moment().subtract(1, 'minute'),
  });
}

describe('## autoReportsMailing()', () => {
  before(cleanData);

  before(makeTestData);

  it('should change fireTime', async () => {
    await autoReportsMailing();

    const reload = await SurveyCampaign.model
      .findById(surveyCampaign._id)
      .lean();

    expect(reload.fireTime).to.not.eq(surveyCampaign.fireTime);
    expect(moment(reload.fireTime).format('DD'))
      .to.be.eq(moment(surveyCampaign.fireTime).add(1, 'day').format('DD'));
  });
});
