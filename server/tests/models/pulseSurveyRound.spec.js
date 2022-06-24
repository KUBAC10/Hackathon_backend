import chai, { expect } from 'chai';
import _ from 'lodash';
import app from 'index'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import {
  SurveyCampaign,
  PulseSurveyRoundResult
} from 'server/models';

// factories
import {
  companyFactory,
  teamFactory,
  surveyFactory,
  surveySectionFactory,
  surveyItemFactory,
  pulseSurveyDriverFactory,
  pulseSurveyRecipientFactory,
  pulseSurveyRoundFactory
} from 'server/tests/factories';
import PulseSurveyRecipient from '../../models/PulseSurveyRecipient';

chai.config.includeStack = true;

let company;
let team;
let survey;
let drivers;
let campaign;
let surveyItems;
let pulseSurveyRecipients;
let pulseSurveyRound;

async function makeTestData() {
  // create company and team
  company = await companyFactory();
  team = await teamFactory({ company });

  // create survey
  survey = await surveyFactory({ company, team, surveyType: 'pulse' });
  const surveySection = await surveySectionFactory({ company, team, survey });

  // update campaign data
  campaign = await SurveyCampaign.model.findOne({ _id: survey.pulseDistribute });
  Object.assign(campaign, { questionPerSurvey: 5 });
  await campaign.save();

  // create drivers
  drivers = await Promise.all(_.flatMap(_.times(5), () => [
    pulseSurveyDriverFactory({ survey, company })
  ]));

  // create surveyItems
  surveyItems = await Promise.all(_.flatMap(_.times(20), () => [
    surveyItemFactory({
      company,
      team,
      survey: survey._id,
      surveySection: surveySection._id,
      pulseSurveyDriver: _.sample(drivers)._id
    })
  ]));
}

describe('PulseSurveyRound Model', () => {
  describe('process()', () => {
    before(cleanData);

    before(makeTestData);

    beforeEach(async () => {
      // create round
      pulseSurveyRound = await pulseSurveyRoundFactory({
        company,
        team,
        survey,
        surveyCampaign: campaign
      });

      // create pulseSurveyRecipients
      pulseSurveyRecipients = await Promise.all(_.flatMap(_.times(3), () => [
        pulseSurveyRecipientFactory({
          survey,
          active: true,
          surveyCampaign: campaign
        })
      ]));
    });

    it('should process round', async () => {
      await pulseSurveyRound.process();
    });

    it('should process all participants round', async () => {
      const result = await pulseSurveyRound.process();

      pulseSurveyRecipients.map(rec =>
        expect(result.processed[rec._id]).to.be.eq(true)
      );

      pulseSurveyRecipients.map(rec =>
        expect(result.skipped[rec._id]).to.be.eq(undefined)
      );
    });

    it('should send all question to all recipients', async () => {
      // questionPerSurvey: 20 -> each participant should receive 20 questions in one round
      Object.assign(campaign, { questionPerSurvey: 20 });
      await campaign.save();

      await pulseSurveyRound.process();

      pulseSurveyRecipients = await PulseSurveyRecipient
        .model
        .find({ _id: { $in: pulseSurveyRecipients.map(i => i._id) } }, 'surveyItemsMap');

      // check participants map to contain each key of survey
      pulseSurveyRecipients.map(rec =>
        surveyItems.map(sI =>
          expect(rec.surveyItemsMap[sI._id]).to.be.eq(true)
        )
      );

      // should create new PulseSurveyRoundResult to each rec
      const roundResults = await PulseSurveyRoundResult
        .model
        .find({
          pulseSurveyRound,
          recipient: { $in: pulseSurveyRecipients.map(i => i._id) },
        });

      expect(roundResults.length).to.be.eq(3);

      // each result should contain all surveyItems from current round
      roundResults.map(roundRes =>
        surveyItems.map(sI =>
          expect(roundRes.surveyItemsMap[sI._id]).to.be.eq(true)
        )
      );
    });

    it('should skip recipient if already processed', async () => {
      await pulseSurveyRound.process();
      const result = await pulseSurveyRound.process();

      pulseSurveyRecipients.map(rec =>
        expect(result.processed[rec._id]).to.be.eq(undefined)
      );

      pulseSurveyRecipients.map(rec =>
        expect(result.skipped[rec._id]).to.be.eq(true)
      );
    });

    it('should again process all questions to new round', async () => {
      // questionPerSurvey: 20 -> each participant should receive 20 questions in one round
      Object.assign(campaign, { questionPerSurvey: 20 });
      await campaign.save();

      // process first round
      await pulseSurveyRound.process();

      // create new round
      pulseSurveyRound = await pulseSurveyRoundFactory({
        company,
        team,
        survey,
        surveyCampaign: campaign
      });

      // process second round
      await pulseSurveyRound.process();

      pulseSurveyRecipients = await PulseSurveyRecipient
        .model
        .find({ _id: { $in: pulseSurveyRecipients.map(i => i._id) } }, 'surveyItemsMap');

      // check participants map to contain each key of survey
      pulseSurveyRecipients.map(rec =>
        surveyItems.map(sI =>
          expect(rec.surveyItemsMap[sI._id]).to.be.eq(true)
        )
      );

      // should create new PulseSurveyRoundResult to each rec
      const roundResults = await PulseSurveyRoundResult
        .model
        .find({
          pulseSurveyRound,
          recipient: { $in: pulseSurveyRecipients.map(i => i._id) },
        });

      expect(roundResults.length).to.be.eq(3);

      // each result should contain all surveyItems from current round
      roundResults.map(roundRes =>
        surveyItems.map(sI =>
          expect(roundRes.surveyItemsMap[sI._id]).to.be.eq(true)
        )
      );
    });
  });

  describe('sendReminders()', () => {
    it('should send reminders to recipients', async () => {
      const pulseSurveyRound = await pulseSurveyRoundFactory({ survey, surveyCampaign: campaign });

      await pulseSurveyRound.sendReminders();
    });
  });
});
