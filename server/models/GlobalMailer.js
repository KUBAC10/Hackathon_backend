import keystone from 'keystone';
import uniqueValidator from 'mongoose-unique-validator';

// helpers
import {
  abortTransaction,
  commitTransaction,
  initSessionWithTransaction
} from '../helpers/transactions';

// models
import {
  Mailer,
  Company
} from './index';

const Types = keystone.Field.Types;

/**
 * Global Mailer Model
 * ===================
 */
const GlobalMailer = new keystone.List('GlobalMailer', {
  track: true
});
GlobalMailer.add({
  name: {
    type: String,
    initial: true,
    required: true
  },
  type: {
    type: Types.Select,
    options: 'surveyComplete, surveyInvitation, base, questionNotification, pulseCompleted, pulseFirstInvitation, pulseSecondInvitation, pulseReminder, reminderAfterFirstInvitation, reminderAfterSecondInvitation, pulseReminderWithQuestion, autoReport',
    initial: true,
    required: true
  },
  templateVariables: {
    type: Types.Code,
    language: 'json',
    note: 'Keys - template variables, values - content labels keys'
  },
  release: {
    type: Boolean,
    default: false
  },
  description: {
    type: String
  },
  subject: {
    type: String
  },
  template: {
    type: Types.Html, wysiwyg: true,
  },
  smsTemplate: {
    type: Types.Textarea,
  },
  pulse: {
    type: Boolean
  }
});

// start session
GlobalMailer.schema.pre('save', async function (next) {
  try {
    this._innerSession = !this.$session();
    this.currentSession = this.$session() || await initSessionWithTransaction();
    next();
  } catch (e) {
    /* istanbul ignore next */
    await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// create new mailers
GlobalMailer.schema.pre('save', async function (next) {
  try {
    if (this.isModified('release') && this.release) {
      const companies = await Company.model.find();
      // add mailer to each company
      for (const company of companies) {
        // create mailer
        const mailer = new Mailer.model({
          company: company._id,
          subject: this.subject,
          type: this.type,
          globalMailer: this._id,
          name: this.name,
          template: this.template,
          smsTemplate: this.smsTemplate,
          fromGlobal: true,
          pulse: this.pulse
        });

        await mailer.save({ session: this.currentSession });
      }
    }

    next();
  } catch (e) {
    /* istanbul ignore next */
    await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// // handle exist mailers
// GlobalMailer.schema.pre('save', async function (next) {
//   try {
//     if ((this.isModified('name') || this.isModified('description')) && !this.isNew) {
//       const mailers = await Mailer.model.find({ globalMailer: this._id });
//       for (const mailer of mailers) {
//         mailer.name = this.name;
//         await mailer.save({ session: this.currentSession });
//       }
//     }
//     next();
//   } catch (e) {
//     /* istanbul ignore next */
//     await abortTransaction(this.currentSession);
//     /* istanbul ignore next */
//     return next(e);
//   }
// });

// commit session
GlobalMailer.schema.pre('save', async function (next) {
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

GlobalMailer.schema.plugin(uniqueValidator, { message: 'This {PATH} has already been taken' });

/**
 * Registration
 */
GlobalMailer.defaultColumns = 'name createdAt';
GlobalMailer.register();

export default GlobalMailer;
