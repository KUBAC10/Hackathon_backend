import chai, { expect } from 'chai';
import moment from 'moment';
import app from '../../..'; // eslint-disable-line

// helpers
import cleanData from '../testHelpers/cleanData';

// models
import { PulseSurveyRound } from '../../models';

// cron
import processPulseSurveyRound from '../../cron/processPulseSurveyRound';

// factories
import {
  companyFactory,
  surveyCampaignFactory,
  surveyFactory,
  teamFactory,
  pulseSurveyRoundFactory, mailerFactory,
} from '../factories';

chai.config.includeStack = true;

let company;
let team;
let survey;
let surveyCampaign;
let pulseSurveyRound;

// Survey Compain's params
let date;

let startDate;
let endDate;

const surveyCampaignParams = {
  name: 'New Name',
  status: 'active',
  pulse: true,
  type: 'email',
  frequency: 'weekly',
  emails: ['qwe1@qwe.qwe'],
  sendReminderMailer: true,
  startDate,
  endDate
};

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  survey = await surveyFactory({ company, team });

  await mailerFactory({ company, team, type: 'reminderAfterFirstInvitation' });
}

describe('## processPulseSurveyRound()', () => {
  beforeEach(cleanData);

  beforeEach(makeTestData);

  it('should send a reminder email', async () => {
    // Middle date that triggers reminder ( Middle by days but one hour earlier form current time )
    date = moment()
      .subtract(4, 'days')
      .subtract(1, 'hours');

    startDate = moment(date).toISOString();
    endDate = moment(date).add(7, 'days').toISOString();

    surveyCampaign = await surveyCampaignFactory({
      company,
      team,
      survey,
      ...surveyCampaignParams
    });

    pulseSurveyRound = await pulseSurveyRoundFactory({ surveyCampaign, startDate, endDate });

    await processPulseSurveyRound();

    const reloadedPulseRound = await PulseSurveyRound.model.findOne({ _id: pulseSurveyRound._id });

    expect(reloadedPulseRound._id.toString()).to.be.eq(pulseSurveyRound._id.toString());
    expect(reloadedPulseRound.reminderSent).to.be.eq(true);
  });

  it('should NOT send a reminder email', async () => {
    // Middle date that doesn't trigger reminder ( Middle by days but one hour above current time )
    date = moment()
      .subtract(4, 'days')
      .add(1, 'hours');

    startDate = moment(date).toISOString();
    endDate = moment(date).add(7, 'days').toISOString();

    surveyCampaign = await surveyCampaignFactory({
      company,
      team,
      survey,
      ...surveyCampaignParams
    });

    pulseSurveyRound = await pulseSurveyRoundFactory({ surveyCampaign, startDate, endDate });

    await processPulseSurveyRound();

    const reloadedPulseRound = await PulseSurveyRound.model.findOne({ _id: pulseSurveyRound._id });

    expect(reloadedPulseRound._id.toString()).to.be.eq(pulseSurveyRound._id.toString());
    expect(reloadedPulseRound.reminderSent).to.be.eq(false);
  });
});
