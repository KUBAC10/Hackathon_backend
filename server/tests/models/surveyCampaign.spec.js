import chai, { expect } from 'chai';
import app from 'index'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import {
  SurveyCampaign,
  PulseSurveyRecipient,
  PulseSurveyRound
} from 'server/models';

// factories
import {
  companyFactory,
  teamFactory,
  surveyFactory,
  surveyCampaignFactory,
  pulseSurveyRoundFactory
} from '../factories';

chai.config.includeStack = true;

let company;
let team;
let survey;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  survey = await surveyFactory({ team, company, surveyType: 'pulse' });
}

describe('Survey Campaign Model', () => {
  before(cleanData);

  before(makeTestData);

  describe('Pre save', () => {
    it('create new pulse survey recipients', async () => {
      const email = 'qwe@qwe.qwe';
      const surveyCampaign = await surveyCampaignFactory({
        team,
        company,
        survey,
        pulse: true
      });

      surveyCampaign.emails = [email];

      await surveyCampaign.save();

      const recipients = await PulseSurveyRecipient.model
        .find({ surveyCampaign: surveyCampaign._id })
        .lean();

      expect(recipients).to.be.an('array');
      expect(recipients.length).to.be.eq(1);

      const [recipient] = recipients;

      expect(recipient.email).to.be.eq(email);
    });

    it('create remove old and create new pulse survey recipients', async () => {
      const email1 = 'qwe@qwe.qwe';
      const email2 = 'qwe@qwe.qwe';

      const surveyCampaign = await surveyCampaignFactory({
        team,
        company,
        survey,
        pulse: true,
        emails: [email1, email2]
      });

      surveyCampaign.emails = [email1];

      await surveyCampaign.save();

      const recipients = await PulseSurveyRecipient.model
        .find({ surveyCampaign: surveyCampaign._id })
        .lean();

      expect(recipients).to.be.an('array');
      expect(recipients.length).to.be.eq(1);

      const [recipient] = recipients;

      expect(recipient.email).to.be.eq(email1);
    });
  });

  describe('Methods', () => {
    describe('createRound', () => {
      it('should create new pulse survey round', async () => {
        const surveyCampaign = await surveyCampaignFactory({
          company,
          team,
          survey,
          pulse: true,
          emails: ['qwe@qwe.qwe'],
          endDate: new Date()
        });

        await surveyCampaign.createRound();

        const pulseSurveyRounds = await PulseSurveyRound.model
          .find({ surveyCampaign: surveyCampaign._id })
          .lean();

        expect(pulseSurveyRounds).to.be.an('array');
        expect(pulseSurveyRounds.length).to.be.eq(1);

        const reloadSurveyCampaign = await SurveyCampaign.model
          .findOne({ _id: surveyCampaign._id })
          .lean();

        expect(reloadSurveyCampaign.endDate).to.not.eq(surveyCampaign.endDate);
      });

      it('should skip creation if active round exists', async () => {
        const surveyCampaign = await surveyCampaignFactory({ team, company, survey, pulse: true });

        await pulseSurveyRoundFactory({ surveyCampaign });

        surveyCampaign.createRound();

        const pulseSurveyRounds = await PulseSurveyRound.model
          .find({ surveyCampaign: surveyCampaign._id })
          .lean();

        expect(pulseSurveyRounds).to.be.an('array');
        expect(pulseSurveyRounds.length).to.be.eq(1);
      });
    });
  });
});
