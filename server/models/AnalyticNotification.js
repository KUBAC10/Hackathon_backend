import keystone from 'keystone';

const Types = keystone.Field.Types;

/**
 * AnalyticNotification Model
 * ===========
 */

const AnalyticNotification = new keystone.List('AnalyticNotification', {
  track: true,
  defaultSort: 'createdAt'
});

AnalyticNotification.add({
  survey: {
    type: Types.Relationship,
    ref: 'Survey',
    initial: true,
    required: true
  },
  surveyItem: {
    type: Types.Relationship,
    ref: 'SurveyItem'
  },
  questionItem: {
    type: Types.Relationship,
    ref: 'QuestionItem'
  },
  country: {
    type: Types.Relationship,
    ref: 'Country'
  },
  value: {
    type: String
  },
  team: {
    type: Types.Relationship,
    ref: 'Team',
    initial: true,
    required: true
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true,
    required: true
  },
  period: {
    type: Types.Select,
    options: 'days, week, month',
    initial: true,
    required: true
  },
  type: {
    type: Types.Select,
    options: ['correlation', 'mostSelectedCountry', 'mostSelectedValue', 'mostSelectedOption', 'meanValue', 'started', 'completed', 'locationCountry', 'locationCity'],
    initial: true,
    required: true
  },
  left: {
    surveyItem: {
      type: Types.Relationship,
      ref: 'SurveyItem'
    },
    questionItem: {
      type: Types.Relationship,
      ref: 'QuestionItem'
    }
  },
  right: {
    surveyItem: {
      type: Types.Relationship,
      ref: 'SurveyItem'
    },
    questionItem: {
      type: Types.Relationship,
      ref: 'QuestionItem'
    }
  },
  correlation: {
    type: Number
  },
  coefficient: {
    type: Number
  },
  from: {
    type: Types.Date
  },
  to: {
    type: Types.Date
  }
});

/**
 * Registration
 */
AnalyticNotification.defaultColumns = 'survey company team period';
AnalyticNotification.register();

export default AnalyticNotification;
