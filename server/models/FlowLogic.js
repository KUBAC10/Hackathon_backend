import keystone from 'keystone';

// helpers
import {
  abortTransaction,
  commitTransaction,
  initSessionWithTransaction
} from '../helpers/transactions';
import handleSortableId from '../helpers/handleSortableId';
import { checkLimit, handleLimit } from '../helpers/limitation';

// models
import { FlowItem } from '../models';

const Types = keystone.Field.Types;

/**
 * Flow Logic Model
 * =================
 */
const FlowLogic = new keystone.List('FlowLogic', {
  track: true
});

FlowLogic.add({
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
  sortableId: {
    type: Types.Number,
    required: true,
    default: 0
  },
  surveyItem: {
    type: Types.Relationship,
    ref: 'SurveyItem',
    initial: true,
    required: true,
  },
  method: {
    type: Types.Select,
    options: ['every', 'some']
  },
  action: {
    type: Types.Select,
    options: ['endSurvey', 'toSection']
  },
  section: {
    type: Types.Relationship,
    ref: 'SurveySection'
  },
  endPage: {
    type: Types.Relationship,
    ref: 'ContentItem'
  }
});

FlowLogic.schema.add({ draftData: { type: Object } });

FlowLogic.schema.virtual('flowItems', {
  ref: 'FlowItem',
  localField: '_id',
  foreignField: 'flowLogic',
  options: { sort: { sortableId: 1 } }
});

// check company limit
FlowLogic.schema.pre('save', async function (next) {
  try {
    if (this.isNew) await checkLimit(this);
  } catch (e) {
    return next(e);
  }
});

// handle sortableId
FlowLogic.schema.pre('save', async function (next) {
  try {
    await handleSortableId(this, FlowLogic);

    next();
  } catch (e) {
    return next(e);
  }
});

// change draft remove status on related entities
FlowLogic.schema.pre('save', async function (next) {
  try {
    if (!this.isNew && this.isModified('draftRemove')) {
      await FlowItem.model
        .updateMany({ flowLogic: this._id }, { $set: { draftRemove: this.draftRemove } });
    }
  } catch (e) {
    return next(e);
  }
});

// handle company limit
FlowLogic.schema.post('save', async function (next) {
  try {
    if (this._limit) await handleLimit(this._limit);
  } catch (e) {
    return next(e);
  }
});

// start remove session
FlowLogic.schema.pre('remove', async function (next) {
  try {
    this._innerSession = !this.$session();
    this.currentSession = this.$session() || await initSessionWithTransaction();
    next();
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// Clear related entities
FlowLogic.schema.pre('remove', async function (next) {
  try {
    const { FlowItem } = keystone.lists;

    await FlowItem.model.deleteMany({ flowLogic: this._id }, { session: this.currentSession });

    next();
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// commit remove session
FlowLogic.schema.pre('remove', async function (next) {
  try {
    if (this._innerSession) await commitTransaction(this.currentSession);
    next();
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

/**
 * Registration
 */
FlowLogic.register();

export default FlowLogic;
