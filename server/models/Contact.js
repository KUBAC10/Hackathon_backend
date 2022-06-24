import keystone from 'keystone';
import uniqueValidator from 'mongoose-unique-validator';

// validator
import { emailValidator, phoneNumberValidator } from '../helpers/validators';

// models
import {
  Team
} from './index';

// helpers
import {
  abortTransaction,
  commitTransaction,
  initSessionWithTransaction
} from '../helpers/transactions';

const Types = keystone.Field.Types;

/**
 * Contact Model
 * =============
 */
const Contact = new keystone.List('Contact', {
  track: true,
  defaultSort: '-createdAt'
});

Contact.add(
  {
    name: {
      type: Types.Name
    },
    email: {
      type: String,
      initial: true,
      lowercase: true,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      initial: true,
      trim: true,
      note: '1-15 digit numbers'
    },
    company: {
      type: Types.Relationship,
      ref: 'Company',
      noedit: true,
      initial: true,
      required: true,
      note: 'Auto set from team'
    },
    team: {
      type: Types.Relationship,
      ref: 'Team',
      initial: true,
      required: true
    },
  }
);

Contact.relationship({ path: 'tagEntities', ref: 'TagEntity', refPath: 'contact' });

// virtual relations
Contact.schema.virtual('tagEntities', {
  ref: 'TagEntity',
  localField: '_id',
  foreignField: 'contact'
});

Contact.schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    /* istanbul ignore next */
    delete ret._;
    /* istanbul ignore next */
    return ret;
  }
});

// Validate email and phone number
Contact.schema.pre('save', async function (next) {
  try {
    await emailValidator(this, next);
    await phoneNumberValidator(this, next);
    next();
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
});

// Automatically set company from team
Contact.schema.pre('save', async function (next) {
  if (this.isModified('team')) {
    try {
      const doc = await Team.model.findById(this.team).lean();
      this.company = doc.company;
    } catch (e) {
      /* istanbul ignore next */
      return next(e);
    }
  }
  next();
});

// start remove session
Contact.schema.pre('remove', async function (next) {
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
Contact.schema.pre('remove', async function (next) {
  try {
    const TagEntity = keystone.lists.TagEntity;
    await TagEntity.model.deleteMany({ contact: this._id }, { session: this.currentSession });

    next();
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// commit remove session
Contact.schema.pre('remove', async function (next) {
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

Contact.schema.index({ email: 1, team: 1 }, { unique: true });
Contact.schema.plugin(uniqueValidator, { message: 'This {PATH} has already been taken' });
/**
 * Registration
 */
Contact.defaultColumns = 'name email phoneNumber company team createdAt';
Contact.register();

export default Contact;
