import keystone from 'keystone';
import mongoose from 'mongoose';

// helpers
import handleSortableId from '../helpers/handleSortableId';
import { checkLimit, handleLimit } from '../helpers/limitation';

const Types = keystone.Field.Types;

const questionTypes = ['countryList', 'text', 'multipleChoice', 'checkboxes', 'dropdown', 'linearScale', 'thumbs', 'netPromoterScore', 'slider', 'multipleChoiceMatrix', 'checkboxMatrix', 'endPage', 'imageChoice'];
const conditions = ['selected', 'notSelected', 'greater', 'greaterEqual', 'less', 'lessEqual', 'equal', 'notEqual', 'empty', 'notEmpty', 'contains', 'notContains', 'matchRegExp', 'beginsWith', 'endsWith', 'range'];

/**
 * Flow Item Model
 * =================
 */
const FlowItem = new keystone.List('FlowItem', {
  track: true
});

FlowItem.add({
  inDraft: {
    type: Boolean
  },
  draftRemove: {
    type: Boolean
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true,
    required: true
  },
  team: {
    type: Types.Relationship,
    ref: 'Team',
    initial: true,
    required: true
  },
  survey: {
    type: Types.Relationship,
    ref: 'Survey',
    initial: true,
    required: true
  },
  sortableId: {
    type: Types.Number,
    required: true,
    default: 0
  },
  questionType: {
    type: Types.Select,
    options: questionTypes
  },
  condition: {
    type: Types.Select,
    options: conditions,
    required: true,
    default: 'empty'
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
  },
  questionItems: {
    type: Types.Relationship,
    ref: 'QuestionItem',
    many: true,
  },
  customAnswer: {
    type: Boolean
  },
  value: {
    type: String,
    note: 'For text questions, etc.'
  },
  count: {
    type: Types.Number,
    note: 'For actions which required count of value or items',
    default: 0
  },
  country: {
    type: Types.Relationship,
    ref: 'Country',
    many: false
  },
  range: {
    from: {
      type: Number,
      default: 0
    },
    to: {
      type: Number,
      default: 0
    },
  },
  displayLogic: {
    type: Types.Relationship,
    ref: 'DisplayLogic'
  },
  flowLogic: {
    type: Types.Relationship,
    ref: 'FlowLogic'
  }
});

FlowItem.schema.add({ draftData: { type: Object } });

FlowItem.schema.add({
  endPage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContentItem',
    required () {
      return this.questionType === 'endPage';
    }
  }
});

// check company limit
FlowItem.schema.pre('save', async function (next) {
  try {
    if (this.isNew) await checkLimit(this);
  } catch (e) {
    return next(e);
  }
});

// handle sortableId
FlowItem.schema.pre('save', async function (next) {
  try {
    await handleSortableId(this, FlowItem);

    next();
  } catch (e) {
    return next(e);
  }
});

// handle company limit
FlowItem.schema.post('save', async function (next) {
  try {
    if (this._limit) await handleLimit(this._limit);
  } catch (e) {
    return next(e);
  }
});

/**
 * Registration
 */
FlowItem.register();

export default FlowItem;
