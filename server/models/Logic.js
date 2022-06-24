import keystone from 'keystone';

const Types = keystone.Field.Types;
const actions = 'selected, notSelected, greater, greaterEqual, less, lessEqual, equal, notEqual, empty, notEmpty, contains, notContains, matchRegExp';
const questionTypes = [
  'text',
  'multipleChoice',
  'dropdown',
  'checkboxes',
  'button',
  'slider',
  'linearScale',
  'netPromoterScore',
  'thumbs',
  'multipleChoiceMatrix',
  'checkboxMatrix'
];

const logic = {
  company: {
    type: Types.Relationship,
    ref: 'Company',
    required: true,
    initial: true
  },
  team: {
    type: Types.Relationship,
    ref: 'Team',
    required: true,
    initial: true
  },
  survey: {
    type: Types.Relationship,
    ref: 'Survey',
    required: true,
    initial: true
  },
  surveySection: {
    type: Types.Relationship,
    ref: 'SurveySection',
    initial: true,
    required: true,
  },
  surveyItem: {
    type: Types.Relationship,
    ref: 'SurveyItem',
    initial: true,
    required: true,
  },
  toSection: {
    type: Types.Relationship,
    ref: 'SurveySection',
    initial: true,
    note: 'Link to section fot toSection type'
  },
  question: {
    type: Types.Relationship,
    ref: 'Question',
    required: true,
    initial: true
  },
  questionType: {
    type: Types.Select,
    options: questionTypes,
    note: 'Auto selected from question of surveyItem'
  },
  action: {
    type: Types.Select,
    options: actions,
    initial: true,
    required: true
  },
  questionItems: {
    type: Types.Relationship,
    ref: 'QuestionItem',
    many: true,
  },
  value: {
    type: String,
    note: 'For text questions, etc.'
  },
  count: {
    type: Types.Number,
    note: 'For actions which required count of value or items'
  },
  sortableId: {
    type: Types.Number,
    required: true,
    default: 0
  },
  gridRow: {
    type: Types.Relationship,
    ref: 'GridRow',
    many: false,
  },
  gridColumn: {
    type: Types.Relationship,
    ref: 'GridColumn',
    many: false,
  }
};

export default logic;
