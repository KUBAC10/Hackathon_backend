import moment from 'moment';
import chai, { expect } from 'chai';
import app from 'index'; // eslint-disable-line

// cronJob
import distribute from '../../../../cron/distribute';

// helpers
import cleanData from '../../../testHelpers/cleanData';

// modes
import {
  SurveyCampaign,
  Invite
} from '../../../../models';

// factories
import {
  companyFactory,
  mailerFactory,
  surveyCampaignFactory,
  surveyFactory,
  teamFactory,
  contactFactory
} from '../../../factories';

chai.config.includeStack = true;

let company;
let team;
let survey;
let invitationMailer;
let completionMailer;
let invitesData;

async function makeTestData() {
  company = await companyFactory();

  team = await teamFactory({ company });

  survey = await surveyFactory({ company, team });

  completionMailer = invitationMailer = await mailerFactory({ company });

  // create contacts
  const contacts = await Promise.all([
    contactFactory({ company, team }),
    contactFactory({ company, team }),
    contactFactory({ company, team })
  ]);

  // create invites data
  invitesData = [
    ...contacts.map(({ _id, email }) => ({ _id, email })),
    { email: 'qwe1@qwe.qwe' },
    { email: 'qwe2@qwe.qwe' },
    { email: 'qwe3@qwe.qwe' }
  ];
}

describe('# Distribute CronJob', () => {
  before(cleanData);

  before(makeTestData);

  it('should set finish status on once frequency', async () => {
    const surveyCampaign = await surveyCampaignFactory({
      status: 'active',
      company,
      survey,
      invitationMailer,
      completionMailer,
      invitesData,
      fireTime: moment().subtract(1, 'minute')
    });

    // cron job on tick function
    await distribute();

    const [
      reloadCampaign,
      invites
    ] = await Promise.all([
      SurveyCampaign.model
        .findById(surveyCampaign)
        .lean(),
      Invite.model
        .find({ surveyCampaign: surveyCampaign._id })
        .lean()
    ]);

    expect(reloadCampaign.status).to.be.eq('finished');
    expect(reloadCampaign.invitesData.length).to.be.eq(invites.length);
    expect(reloadCampaign.fireTime.toString()).to.be.eq(surveyCampaign.fireTime.toString());
    expect(invites.filter(i => !!i.contact).length).to.be.eq(3);
    expect(invites.filter(i => !i.contact).length).to.be.eq(3);
  });

  it('should set finish status if out of campaign range', async () => {
    const surveyCampaign = await surveyCampaignFactory({
      endDate: moment().add(6, 'days'),
      frequency: 'weekly',
      status: 'active',
      company,
      survey,
      invitationMailer,
      completionMailer,
      invitesData,
      fireTime: moment().subtract(1, 'minute')
    });

    // cron job on tick function
    await distribute();

    const [
      reloadCampaign,
      invites
    ] = await Promise.all([
      SurveyCampaign.model
        .findById(surveyCampaign)
        .lean(),
      Invite.model
        .find({ surveyCampaign: surveyCampaign._id })
        .lean()
    ]);

    expect(reloadCampaign.status).to.be.eq('finished');
    expect(reloadCampaign.invitesData.length).to.be.eq(invites.length);
    expect(invites.filter(i => !!i.contact).length).to.be.eq(3);
    expect(invites.filter(i => !i.contact).length).to.be.eq(3);
  });

  it('should set finish status if out of survey range', async () => {
    const survey = await surveyFactory({ company, team, endDate: moment().add(6, 'days') });
    const surveyCampaign = await surveyCampaignFactory({
      frequency: 'weekly',
      status: 'active',
      company,
      survey,
      invitationMailer,
      completionMailer,
      invitesData,
      fireTime: moment().subtract(1, 'minute')
    });

    // cron job on tick function
    await distribute();

    const [
      reloadCampaign,
      invites
    ] = await Promise.all([
      SurveyCampaign.model
        .findById(surveyCampaign)
        .lean(),
      Invite.model
        .find({ surveyCampaign: surveyCampaign._id })
        .lean()
    ]);

    expect(reloadCampaign.status).to.be.eq('finished');
    expect(reloadCampaign.invitesData.length).to.be.eq(invites.length);
    expect(invites.filter(i => !!i.contact).length).to.be.eq(3);
    expect(invites.filter(i => !i.contact).length).to.be.eq(3);
  });

  it('should increase fire time on week for weekly frequency', async () => {
    const fireTime = moment();

    const surveyCampaign = await surveyCampaignFactory({
      frequency: 'weekly',
      status: 'active',
      company,
      survey,
      invitationMailer,
      completionMailer,
      invitesData,
      fireTime
    });

    // cron job on tick function
    await distribute();

    const [
      reloadCampaign,
      invites
    ] = await Promise.all([
      SurveyCampaign.model
        .findById(surveyCampaign)
        .lean(),
      Invite.model
        .find({ surveyCampaign: surveyCampaign._id })
        .lean()
    ]);

    expect(reloadCampaign.status).to.be.eq('active');
    expect(reloadCampaign.invitesData.length).to.be.eq(invites.length);
    expect(moment(reloadCampaign.fireTime).toString()).to.be.eq(moment(fireTime).add(1, 'week').toString());
    expect(invites.filter(i => !!i.contact).length).to.be.eq(3);
    expect(invites.filter(i => !i.contact).length).to.be.eq(3);
  });

  it('should skip campaign without data for invites', async () => {
    const surveyCampaign = await surveyCampaignFactory({
      frequency: 'once',
      status: 'active',
      company,
      survey,
      invitationMailer,
      completionMailer
    });

    // cron job on tick function
    await distribute();

    const [
      reloadCampaign,
      invitesCount
    ] = await Promise.all([
      SurveyCampaign.model
        .findById(surveyCampaign)
        .lean(),
      Invite.model
        .find({ surveyCampaign: surveyCampaign._id })
        .countDocuments()
    ]);

    expect(reloadCampaign.status).to.be.eq('active');
    expect(reloadCampaign.fireTime.toString()).to.be.eq(surveyCampaign.fireTime.toString());
    expect(invitesCount).to.be.eq(0);
  });
});
