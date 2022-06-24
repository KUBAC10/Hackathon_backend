import keystone from 'keystone';

// helpers
import {
  abortTransaction,
  commitTransaction,
  initSessionWithTransaction
} from '../helpers/transactions';
import handleSortableId from '../helpers/handleSortableId';

// TODO add displayLogic to company limitation
// import { checkLimit, handleLimit } from '../helpers/limitation';

// models
import { FlowItem } from '../models';

const Types = keystone.Field.Types;

/**
 * Display Logic Model
 * =================
 */
const DisplayLogic = new keystone.List('DisplayLogic', {
  track: true
});

DisplayLogic.add({
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
  surveyItem: { // display/hide this question
    type: Types.Relationship,
    ref: 'SurveyItem',
    initial: true,
    required: true
  },
  conditionSurveyItem: { // by answers from this question
    type: Types.Relationship,
    ref: 'SurveyItem'
  },
  method: {
    type: Types.Select,
    options: ['every', 'some']
  },
  type: {
    type: Types.Select,
    options: ['question', 'option', 'section'],
    default: 'question'
  },
  display: {
    type: Boolean,
    default: true
  }
});

DisplayLogic.schema.add({ draftData: { type: Object } });

DisplayLogic.schema.virtual('flowItems', {
  ref: 'FlowItem',
  localField: '_id',
  foreignField: 'displayLogic',
  options: { sort: { sortableId: 1 } }
});

// check company limit
// DisplayLogic.schema.pre('save', async function (next) {
//   try {
//     if (this.isNew) await checkLimit(this);
//   } catch (e) {
//     return next(e);
//   }
// });

// handle sortableId
DisplayLogic.schema.pre('save', async function (next) {
  try {
    await handleSortableId(this, DisplayLogic);

    next();
  } catch (e) {
    return next(e);
  }
});

// change draft remove status on related entities
DisplayLogic.schema.pre('save', async function (next) {
  try {
    if (!this.isNew && this.isModified('draftRemove')) {
      await FlowItem.model
        .updateMany({ displayLogic: this._id }, { $set: { draftRemove: this.draftRemove } });
    }
  } catch (e) {
    return next(e);
  }
});

// // remove flowItems on conditionSurveyItem changing
// DisplayLogic.schema.pre('save', async function (next) {
//   try {
//     if (!this.isNew && this.isModified('conditionSurveyItem')) {
//       await FlowItem.model.deleteMany({ displayLogic: this._id });
//     }
//
//     next();
//   } catch (e) {
//     return next(e);
//   }
// });

// handle company limit
// DisplayLogic.schema.post('save', async function (next) {
//   try {
//     if (this._limit) await handleLimit(this._limit);
//   } catch (e) {
//     return next(e);
//   }
// });

// start remove session
DisplayLogic.schema.pre('remove', async function (next) {
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
DisplayLogic.schema.pre('remove', async function (next) {
  try {
    await FlowItem.model.deleteMany({ displayLogic: this._id }, { session: this.currentSession });

    next();
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// commit remove session
DisplayLogic.schema.pre('remove', async function (next) {
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
DisplayLogic.register();

export default DisplayLogic;
