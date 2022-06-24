import keystone from 'keystone';

const Types = keystone.Field.Types;

/**
 * Dashboard Item Model
 * ===================
 */
const DashboardItem = new keystone.List('DashboardItem', {
  track: true,
  defaultSort: '-createdAt'
});

DashboardItem.add({
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
  user: {
    type: Types.Relationship,
    ref: 'User',
    required: true,
    initial: true
  },
  type: {
    type: Types.Select,
    options: 'question, survey',
    initial: true,
    required: true
  },
  question: {
    type: Types.Relationship,
    ref: 'Question',
    initial: true
  },
  survey: {
    type: Types.Relationship,
    ref: 'Survey',
    initial: true
  },
  sortableId: {
    type: Number,
    default: 0,
    note: 'For valid items sorting'
  },
});

/**
 * Registration
 */
DashboardItem.defaultColumns = 'company team question createdAt';
DashboardItem.register();

export default DashboardItem;
