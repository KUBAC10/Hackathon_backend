import keystone from 'keystone';
import moment from 'moment';

import config from '../../config/env';

// models
import Mailer from '../models/Mailer';
import User from '../models/User';

// helpers
import removeFile from '../helpers/removeFile';
import mailBuilder from '../helpers/mailBuilder';
import smsBuilder from '../helpers/smsBuilder';

// config
import { localizationList } from '../../config/localization';

const Types = keystone.Field.Types;

/**
 * Email Model
 * ===========
 */
const attachmentStorage = new keystone.Storage({
  adapter: keystone.Storage.Adapters.FS,
  fs: {
    path: './public/uploads/emails/attachment',
    publicPath: '/uploads/emails/attachment/',
  },
  schema: {
    url: true
  },
});

const Email = new keystone.List('Email', {
  track: true,
  defaultSort: '-createdAt'
});

Email.add({
  name: {
    type: String
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true
  },
  team: {
    type: Types.Relationship,
    ref: 'Team',
    initial: true
  },
  type: {
    type: Types.Select,
    initial: true,
    options: 'email, sms',
    required: true,
    default: 'email'
  },
  user: {
    type: Types.Relationship,
    ref: 'User',
    initial: true
  },
  token: {
    type: String
  },
  to: {
    type: String,
    required: true,
    initial: true
  },
  lang: {
    type: Types.Select,
    options: localizationList.reduce((acc, lang) => `${acc},${lang}`, ''),
    default: 'en'
  },
  mailer: {
    type: Types.Relationship,
    required: true,
    initial: true,
    ref: 'Mailer'
  },
  data: {
    type: Types.Code,
    language: 'json'
  },
  resend: {
    type: Boolean,
    default: false,
    note: 'Set true if you want resend current email or SMS.'
  },
  subject: {
    type: String,
    default: ''
  },
  attachment: { type: Types.File, storage: attachmentStorage }
});

Email.schema.post('init', function () {
  this._oldAttachment = this.toObject().attachment;
});

Email.schema.pre('save', async function (next) {
  if (this.isModified('mailer') || this.isModified('user')) {
    const mailer = await Mailer.model.findById(this.mailer).lean();
    const time = this.createdAt ? moment(this.createdAt) : moment();
    this.name = `${mailer.name} ${time.format('DD/MM/YYYY HH:mm:ss')}`;
  }
  next();
});

Email.schema.pre('save', function (next) {
  /* istanbul ignore if */
  if (this.isModified('attachment') && this._oldAttachment && this._oldAttachment.url) {
    removeFile(this._oldAttachment.url, next);
  } else {
    next();
  }
});

Email.schema.pre('save', async function (next) {
  try {
    if (this.isModified('resend') && this.resend) {
      /* istanbul ignore if */
      if (config.env === 'production') {
        const user = await User.model.findById(this.user).lean();
        const mailer = await Mailer.model.findById(this.mailer).lean();

        if (this.type === 'sms') {
          await smsBuilder({
            user,
            mailer,
            company: this.company,
            to: this.to,
            data: JSON.parse(this.data),
            lang: this.lang,
            type: 'sms',
            save: true,
            _req_user: this._req_user
          });
        }

        if (this.type === 'email') {
          await mailBuilder({
            user,
            mailer,
            company: this.company,
            to: this.to,
            data: JSON.parse(this.data),
            lang: this.lang,
            type: 'email',
            save: true,
            _req_user: this._req_user
          });
        }
      }

      // Return to false value for new resend
      this.resend = false;
    }
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
  next();
});

Email.schema.post('remove', (item) => {
  /* istanbul ignore if */
  if (item.attachment && item.attachment.url) removeFile(item.attachment.url, console.error);
});

/**
 * Registration
 */
Email.defaultColumns = 'name, mailer, user, company, createdAt';
Email.register();

export default Email;
