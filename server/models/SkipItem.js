import keystone from 'keystone';

// helpers
import {
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
} from '../helpers/transactions';

// models
import { Question } from './index';
import logic from './Logic';

const Types = keystone.Field.Types;
const options = 'endSurvey, toSection';
/**
 * SkipItem Model
 * ==============
 */

const SkipItem = new keystone.List('SkipItem', {
  track: true,
  defaultSort: '-createdAt'
});

SkipItem.add({
  ...logic,
  type: {
    type: Types.Select,
    options,
    initial: true,
    required: true
  }
});

// start save session
SkipItem.schema.pre('save', async function (next) {
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

// set question type before save skip item
SkipItem.schema.pre('save', async function (next) {
  try {
    const question = await Question.model
      .findById(this.question, null, { session: this.currentSession })
      .lean();

    // set question type for not populate question for some skip processes in future
    this.questionType = question.type;
    next();
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// commit save session
SkipItem.schema.pre('save', async function (next) {
  try {
    if (this._innerSession) {
      await commitTransaction(this.currentSession);
      this.currentSession = undefined;
    }
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
SkipItem.defaultColumns = 'company team survey createdAt';
SkipItem.register();

export default SkipItem;
