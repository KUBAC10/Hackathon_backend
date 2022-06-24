import keystone from 'keystone';
import mongoose from 'mongoose';
import _ from 'lodash';

// helpers
import {
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
} from '../helpers/transactions';
import parseTpl from '../helpers/parse-es6-template';

import APIMessagesExtractor from '../services/APIMessagesExtractor';

const ValidationError = mongoose.Error.ValidationError;
const ValidatorError = mongoose.Error.ValidatorError;
const Types = keystone.Field.Types;

const tagColors = [
  '#F2C114',
  '#FF971D',
  '#FC7941',
  '#FB6056',
  '#FF505B',
  '#F843A5',
  '#BE4ED1',
  '#6F6CFF',
  '#5B57DF',
  '#3378F7',
  '#3FA1FB',
  '#1EBCEE',
  '#13C8BE',
  '#3DC493',
  '#32BC37'
];

/**
 * Tag Model
 * =========
 */

const Tag = new keystone.List('Tag', {
  track: true,
  defaultSort: '-createdAt'
});

Tag.add({
  name: {
    type: String,
    initial: true,
    required: true
  },
  description: {
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
  isGlobal: {
    type: Boolean
  },
  color: {
    type: String,
    required: true,
    default () {
      return _.sample(tagColors);
    }
  }
});

Tag.relationship({ path: 'tagEntities', ref: 'TagEntity', refPath: 'tag' });

// virtual relations
Tag.schema.virtual('tagEntities', {
  ref: 'TagEntity',
  localField: '_id',
  foreignField: 'tag'
});

Tag.schema.virtual('members', {
  ref: 'TagEntity',
  localField: '_id',
  foreignField: 'tag',
  match: { contact: { $exists: true } },
  count: true
});

Tag.schema.virtual('entitiesCount', {
  ref: 'TagEntity',
  localField: '_id',
  foreignField: 'tag',
  count: true
});

Tag.schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    /* istanbul ignore next */
    delete ret._;
    /* istanbul ignore next */
    return ret;
  }
});

// TODO add soft-delete?
// start remove session
Tag.schema.pre('remove', async function (next) {
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
Tag.schema.pre('remove', async function (next) {
  try {
    const TagEntity = keystone.lists.TagEntity;
    await TagEntity.model.deleteMany({ tag: this._id }, { session: this.currentSession });

    const SurveyCampaign = keystone.lists.SurveyCampaign;
    const surveyCampaigns = await SurveyCampaign.model.find({ tags: this._id });

    // TODO tests + check if session is needed
    for (const surveyCampaign of surveyCampaigns) {
      surveyCampaign.tags.pull(this._id);
      await surveyCampaign.save({ session: this.currentSession });
    }

    next();
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// commit remove session
Tag.schema.pre('remove', async function (next) {
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

Tag.schema.post('save', async function (err, doc, next) {
  try {
    if (err.name === 'MongoError' && err.code === 11000) {
      // list of keys which have unique scope
      const uniqueKeys = ['name'];
      // get first key
      const field = _.find(uniqueKeys, k => err.errmsg.includes(k));
      const error = new ValidationError(this);
      let message = await APIMessagesExtractor.getError(this._lang, 'global.uniqueField');
      message = parseTpl(message, { field }, '');
      error.errors[field] = new ValidatorError({ message });
      return next(error);
    }
  } catch (e) {
    return next(e);
  }
});

// add indexes
Tag.schema.index({ name: 1, company: 1, team: 1 }, { unique: true });

/**
 * Registration
 */
Tag.defaultColumns = 'name, description, company';
Tag.register();

export default Tag;
