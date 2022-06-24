import keystone from 'keystone';
import _ from 'lodash';
import uniqueValidator from 'mongoose-unique-validator';

// services
import { CloudinaryUploader } from '../services';

// helpers
import { emailValidator } from '../helpers/validators';
import {
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
} from '../helpers/transactions';

export const industries = [
  'Software and IT services',
  'E-Commerce',
  'Healthcare',
  'Corporate services',
  'Transportation and logistics',
  'Energy and mining',
  'Academic',
  'FinTech',
  'Telecom',
  'FMCG',
  'Marketing',
  'Other'
];
export const sizes = [
  'me',
  '2-15',
  '16-50',
  '51-200',
  '201-1000',
  '>1000'
];

const Types = keystone.Field.Types;

/**
 * Company Model
 * =============
 */
const Company = new keystone.List('Company', {
  label: 'Company',
  track: true
});

Company.add(
  {
    name: {
      type: String,
      required: true,
      initial: true,
      index: true,
      uniqueCaseInsensitive: true,
      unique: true
    },
    urlName: {
      type: String,
      lowercase: true,
      initial: true,
      required: true,
      index: {
        unique: true,
        partialFilterExpression: { urlName: { $type: 'string' }, sparse: true }
      },
      watch: 'urlName',
      value() {
        /* istanbul ignore next */
        return this.isLite ? this.urlName : _.deburr(_.kebabCase(this.urlName));
      }
    },
    email: {
      type: Types.Email,
      lowercase: true,
      trim: true,
      note: 'Email where would be send company admin emails'
    },
    address: {
      street: { type: String },
      zipCode: { type: String },
      city: { type: String },
      country: {
        type: Types.Relationship,
        ref: 'Country'
      },
    },
    logo: {
      type: Types.CloudinaryImage,
      autoCleanup: true,
      initial: true,
      folder(item) {
        /* istanbul ignore next */
        return `${item._id}/logo/${item._id}`;
      },
    },
    // TODO move config to another model?
    openTextConfig: {
      active: {
        type: Boolean,
        default: false
      },
      requiredNotifications: {
        type: Boolean,
        default: false
      },
      popupMessage: {
        type: Types.Html,
        wysiwyg: true
      },
      // disable selection of text question only on frontend to new surveys
      disableTextQuestions: {
        type: Boolean
      }
    },
    acceptedAt: {
      type: Types.Date,
      default: null,
      note: 'Date when email was accepted'
    },
    colors: {
      primary: {
        type: Types.Color,
        initial: true
      },
      secondary: {
        type: Types.Color,
        initial: true
      }
    },
    size: {
      type: Types.Select,
      options: sizes
    },
    industry: {
      type: Types.Select,
      options: industries
    },
    smsLimit: {
      type: Number,
      default: 0
    },
    isLite: {
      type: Boolean
    }
  }
);

Company.relationship({ path: 'teams', ref: 'Team', refPath: 'company' });

// virtual relations
Company.schema.virtual('teams', {
  ref: 'Team',
  localField: '_id',
  foreignField: 'company'
});

Company.schema.virtual('companyColors', {
  ref: 'CompanyColor',
  localField: '_id',
  foreignField: 'company'
});

Company.schema.virtual('companyLimitation', {
  ref: 'CompanyLimitation',
  localField: '_id',
  foreignField: 'company',
  justOne: true
});

Company.schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    /* istanbul ignore next */
    delete ret._;
    /* istanbul ignore next */
    return ret;
  }
});

Company.schema.post('init', function () {
  const oldThis = this.toObject();

  this._oldLogo = oldThis.logo;
});

// start session
Company.schema.pre('save', async function (next) {
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

// validate email
Company.schema.pre('save', async function (next) {
  try {
    await emailValidator(this, next);
    next();
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
});

// TODO tests
// create mailers
Company.schema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      // models
      const { GlobalMailer, Mailer } = keystone.lists;
      // load all released global mailers
      const appGlobalMailers = await GlobalMailer.model.find({ release: true });
      for (const globalMailer of appGlobalMailers) {
        // create mailers to company from global mailers
        const mailer = new Mailer.model({
          company: this._id,
          globalMailer: globalMailer._id,
          name: globalMailer.name,
          type: globalMailer.type,
          subject: globalMailer.subject,
          template: globalMailer.template,
          smsTemplate: globalMailer.smsTemplate,
          fromGlobal: true
        });

        await mailer.save({ session: this.currentSession });
      }
    } catch (e) {
      /* istanbul ignore next */
      if (this._innerSession) await abortTransaction(this.currentSession);
      /* istanbul ignore next */
      return next(e);
    }
  }
  next();
});

// create company colors
Company.schema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      // models
      const CompanyColor = keystone.lists.CompanyColor;
      // load default colors
      const colors = await CompanyColor.model.find({ type: 'default' });
      // create new colors
      for (const color of colors) {
        const newColor = new CompanyColor.model({
          value: color.value,
          company: this._id
        });
        // save new color
        await newColor.save({ session: this.currentSession });
      }
    } catch (e) {
      /* istanbul ignore next */
      if (this._innerSession) await abortTransaction(this.currentSession);
      /* istanbul ignore next */
      return next(e);
    }
  }
  next();
});

// create limitation for lite company
Company.schema.pre('save', async function (next) {
  try {
    if (this.isNew && this.isLite) {
      const { CompanyLimitation } = keystone.lists;

      const limit = new CompanyLimitation.model({ company: this._id });

      await limit.save();
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// handle colors
Company.schema.pre('save', async function (next) {
  if (this._companyColors) {
    try {
      const CompanyColor = keystone.lists.CompanyColor;

      // remove colors
      const currentColorIds = this._companyColors.map(i => i._id).filter(i => !!i);
      const colorsToRemove = await CompanyColor.model
        .find({ _id: { $nin: currentColorIds }, company: this._id });

      for (const colorToRemove of colorsToRemove) {
        const companyColor = await CompanyColor.model.findById(colorToRemove._id);
        companyColor.remove({ session: this.currentSession });
      }

      let colorDoc;

      // if color have _id update it, otherwise create new
      for (const color of this._companyColors) {
        if (color._id) {
          // find and update
          colorDoc = await CompanyColor.model.findById(color._id);

          // merge values
          _.merge(colorDoc, color);
        } else {
          color.company = this._id;
          colorDoc = new CompanyColor.model(color);
        }

        await colorDoc.save({ session: this.currentSession });
      }
    } catch (e) {
      /* istanbul ignore next */
      if (this._innerSession) await abortTransaction(this.currentSession);
      /* istanbul ignore next */
      return next(e);
    }
  }
  next();
});

// upload new image to cloudinary
Company.schema.pre('save', async function (next) {
  try {
    if (_.isString(this._logo)) {
      this.logo = await CloudinaryUploader
        .uploadImage({
          company: this.company,
          encodedFile: this._logo,
          entity: this,
          actionName: 'companyLogo'
        });

      const oldPublic_id = _.get(this, '_oldLogo.public_id');

      if (oldPublic_id) await CloudinaryUploader.cleanUp({ public_id: oldPublic_id });

      _.unset(this, '_oldLogo');
      _.unset(this, '_logo');
    }

    // remove logo
    if (this._logo === null) {
      const public_id = _.get(this, 'logo.public_id');

      if (public_id) await CloudinaryUploader.cleanUp({ public_id });

      this.logo = undefined;
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// commit session
Company.schema.pre('save', async function (next) {
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

// Clear Cloudinary Images
/* istanbul ignore next */
Company.schema.pre('remove', async function (next) {
  try {
    // clear logo
    if (this.logo.public_id) {
      await CloudinaryUploader.cleanUp({ public_id: this.logo.public_id });
    }

    next();
  } catch (e) {
    /* istanbul ignore next */
    next(e);
  }
});

// TODO: Remove all???

Company.schema.plugin(uniqueValidator, { message: 'This {PATH} has already been taken' });
Company.schema.index({ email: 1, acceptedAt: 1 }, {
  unique: true,
  partialFilterExpression: { acceptedAt: { $type: 'date' } }
});

/**
 * Registration
 */
Company.defaultColumns = 'name email createdAt';
Company.register();

export default Company;
