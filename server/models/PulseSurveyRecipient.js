import keystone from 'keystone';

const Types = keystone.Field.Types;

/**
 * PulseSurveyRecipient Model
 * ===========
 */

const PulseSurveyRecipient = new keystone.List('PulseSurveyRecipient', {
  track: true,
  defaultSort: '-createdAt'
});

PulseSurveyRecipient.add({
  survey: {
    type: Types.Relationship,
    ref: 'Survey'
  },
  surveyCampaign: {
    type: Types.Relationship,
    ref: 'SurveyCampaign'
  },
  contact: {
    type: Types.Relationship,
    ref: 'Contact'
  },
  email: {
    type: Types.Email,
    initial: true,
    required: true
  },
  lastAnswerDate: {
    type: Types.Date
  },
  tags: {
    type: Types.Relationship,
    ref: 'Tag',
    many: true
  },
  unsubscribe: {
    type: Boolean
  }
});

// add surveyItemsMap
// that map would block items to send in next round
PulseSurveyRecipient.schema.add({ surveyItemsMap: { type: Object } });

PulseSurveyRecipient.schema.virtual('surveyResults', {
  ref: 'SurveyResult',
  localField: '_id',
  foreignField: 'recipient'
});

// TODO add index on email + surveyCampaign

/**
 * Registration
 */
PulseSurveyRecipient.defaultColumns = 'email surveyCampaign contact survey';
PulseSurveyRecipient.register();

export default PulseSurveyRecipient;
