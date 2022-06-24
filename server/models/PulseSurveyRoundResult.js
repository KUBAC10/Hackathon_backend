import keystone from 'keystone';
import uuid from 'uuid';

import pulseRoundMailer from '../mailers/pulseRoundMailer';

import APIError from '../helpers/APIError';

const Types = keystone.Field.Types;

/**
 * PulseSurveyRoundResult Model
 * ===========
 */

const PulseSurveyRoundResult = new keystone.List('PulseSurveyRoundResult', {
  track: true,
  defaultSort: '-createdAt'
});

// TODO add company / survey?
PulseSurveyRoundResult.add({
  recipient: {
    type: Types.Relationship,
    ref: 'PulseSurveyRecipient'
  },
  survey: {
    type: Types.Relationship,
    ref: 'Survey'
  },
  surveyCampaign: {
    type: Types.Relationship,
    ref: 'SurveyCampaign'
  },
  pulseSurveyRound: {
    type: Types.Relationship,
    ref: 'PulseSurveyRound'
  },
  token: {
    type: String,
    initial: true,
    default: uuid(),
    note: 'Access Token'
  },
  inviteEmailSendAt: {
    type: Types.Date,
    utc: true
  },
  tags: {
    type: Types.Relationship,
    ref: 'Tag',
    many: true
  }
});

// add surveyItemsMap
// contain surveyItems to answer on current round
// { surveyItemId1, surveyItemId2, surveyItemId3, ... }
PulseSurveyRoundResult.schema.add({ surveyItemsMap: { type: Object } });

// TODO tests
PulseSurveyRoundResult.schema.pre('save', async function (next) {
  try {
    if (this.isNew) {
      const { SurveyCampaign, Mailer } = keystone.lists;

      // check if first round for current campaign
      const prevRoundResults = await PulseSurveyRoundResult
        .model
        .find({ survey: this.survey, _id: { $ne: this._id } })
        .lean();

      // should send first invitation email only in first round of survey
      const firstEmail = !prevRoundResults.length;

      // load campaign
      const campaign = await SurveyCampaign.model
        .findOne({ _id: this.surveyCampaign })
        .populate('survey')
        .lean();

      if (!campaign) return next(new APIError('Survey Campaign is not found', 400));

      const mailer = await Mailer.model
        .findOne({
          company: campaign.company,
          type: firstEmail ? 'pulseFirstInvitation' : 'pulseSecondInvitation'
        })
        .lean();

      if (mailer) {
        await pulseRoundMailer({
          mailer,
          campaign,
          roundResult: this,
          survey: campaign.survey
        });

        this.inviteEmailSendAt = new Date();
      }
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// TODO add logic to send and track emails data

/**
 * Registration
 */
PulseSurveyRoundResult.defaultColumns = '';
PulseSurveyRoundResult.register();

export default PulseSurveyRoundResult;
