import keystone from 'keystone';
import uniqueValidator from 'mongoose-unique-validator';

// helpers
import { checkLimit, handleLimit } from '../helpers/limitation';

const Types = keystone.Field.Types;

/**
 * Mailer Model
 * ============
 */
const Mailer = new keystone.List('Mailer', {
  track: true
});

Mailer.add(
  {
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
    company: {
      type: Types.Relationship,
      ref: 'Company',
      initial: true
    },
    globalMailer: {
      type: Types.Relationship,
      ref: 'GlobalMailer'
    },
    fromGlobal: {
      type: Boolean,
      note: 'Created automatically from global mailer'
    },
    distribute: {
      type: Boolean,
      note: 'Created automatically for distribute'
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
  }
);

Mailer.schema.index({ name: 1, company: 1 }, { unique: true });
Mailer.schema.plugin(uniqueValidator, { message: 'This {PATH} has already been taken' });

// check company limit
Mailer.schema.pre('save', async function (next) {
  try {
    if (this.isNew && this.company) await checkLimit(this);
  } catch (e) {
    return next(e);
  }
});

// handle company limit
Mailer.schema.post('save', async function (next) {
  try {
    if (this._limit) await handleLimit(this._limit);
  } catch (e) {
    return next(e);
  }
});

/**
 * Registration
 */
Mailer.defaultColumns = 'name company type createdAt';
Mailer.register();

export default Mailer;
