import keystone from 'keystone';

// validator
import { emailValidator } from '../helpers/validators';

import contactUsMailer from '../mailers/contactUs.mailer';

import { localizationList } from '../../config/localization';

const Types = keystone.Field.Types;

const config = require('../../config/env');

/**
 * Contact Us Model
 * ================
 */
const ContactUs = new keystone.List('ContactUs', {
  track: true,
  defaultSort: '-createdAt'
});

ContactUs.add(
  {
    name: {
      type: String,
      required: true,
      initial: true
    },
    lang: {
      type: Types.Select,
      options: localizationList.reduce((acc, lang) => `${acc},${lang}`, ''),
      default: 'en'
    },
    email: {
      type: String,
      required: true,
      initial: true,
      lowercase: true,
      trim: true,
      uniqueCaseInsensitive: true,
    },
    comment: {
      type: Types.Textarea
    }
  }
);

// validate email
ContactUs.schema.pre('save', async function (next) {
  try {
    await emailValidator(this, next);
    next();
  } catch (e) {
    return next(e);
  }
});

ContactUs.schema.pre('save', async function (next) {
  try {
    /* istanbul ignore if */
    if (this.isNew && config.env === 'production') {
      const { name, lang, email, comment, createdAt } = this;
      contactUsMailer({ name, lang, email, comment, createdAt });
    }
    next();
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
});

/**
 * Registration
 */
ContactUs.defaultColumns = 'name email';
ContactUs.register();

export default ContactUs;
