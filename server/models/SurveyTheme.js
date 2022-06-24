import keystone from 'keystone';
import _ from 'lodash';

// services
import CloudinaryUploader from '../services/CloudinaryUploader';

// helpers
import { checkLimit, handleLimit } from '../helpers/limitation';

const Types = keystone.Field.Types;

export const fonts = ['roboto', 'montserrat', 'lato', 'rubik', 'garamond', 'raleway', 'ubuntu', 'comfortaa'];

/**
 * SurveyTheme Model
 * ===========
 */

const SurveyTheme = new keystone.List('SurveyTheme', {
  track: true
});

SurveyTheme.add({
  company: {
    type: Types.Relationship,
    ref: 'Company'
  },
  team: {
    type: Types.Relationship,
    ref: 'Team'
  },
  type: {
    type: Types.Select,
    options: 'user, global, survey',
    required: true,
    initial: true,
    default: 'survey'
  },
  name: {
    type: String,
    initial: true,
    required: true,
    default: 'Default Theme'
  },
  primaryColor: {
    type: String,
    default: '#3378F7'
  },
  bgColor: {
    type: String,
    default: '#4b47d9'
  },
  sectionStyle: {
    type: Types.Select,
    options: ['light', 'neutral', 'dark'],
    initial: true,
    default: 'light'
  },
  questionStyle: {
    type: Types.Select,
    options: ['light', 'dark'],
    initial: true,
    default: 'light'
  },
  bgImgType: {
    type: Types.Select,
    options: ['cloudinary', 'unsplash', 'none'],
    default: 'none'
  },
  bgImgUrl: {
    type: String
  },
  bgImgCloudinary: {
    type: Types.CloudinaryImage,
    autoCleanup: true,
    initial: true,
    folder(item) {
      /* istanbul ignore next */
      return `${item.company}/background/${item._id}`;
    },
  },
  bgOpacity: {
    type: Number,
    default: 1
  },
  font: {
    type: Types.Select,
    options: fonts,
    default: 'roboto'
  },
  progressBar: {
    type: Boolean,
    initial: true,
    default: false
  },
  questionNumbers: {
    type: Boolean,
    initial: true,
    default: false
  },
  logo: {
    type: Types.CloudinaryImage,
    autoCleanup: true,
    initial: true,
    folder(item) {
      /* istanbul ignore next */
      return `${item.company}/logo/${item._id}`;
    },
  },
  survey: {
    type: Types.Relationship,
    ref: 'Survey',
    initial: true
  },
});

SurveyTheme.schema.add({ draftData: { type: Object } });

SurveyTheme.schema.post('init', function () {
  const oldThis = this.toObject();

  this._oldLogo = oldThis.logo;
  this._oldBgImgCloudinary = oldThis.bgImgCloudinary;

  _.set(this, 'draftData._oldLogo', _.get(this, 'draftData.logo'));
  _.set(this, 'draftData._oldBgImgCloudinary', _.get(this, 'draftData.bgImgCloudinary'));
});

// check company limit
SurveyTheme.schema.pre('save', async function (next) {
  try {
    if (this.isNew) await checkLimit(this);
  } catch (e) {
    return next(e);
  }
});

// save logo
SurveyTheme.schema.pre('save', async function (next) {
  try {
    const path = this.type === 'survey' && !this._uploadSurvey ? 'draftData.' : '';

    await this.saveLogo(path);

    next();
  } catch (e) {
    /* istanbul ignore next */
    next(e);
  }
});

// save background
SurveyTheme.schema.pre('save', async function (next) {
  try {
    const path = this.type === 'survey' && !this._uploadSurvey ? 'draftData.' : '';

    await this.saveBackground(path);

    next();
  } catch (e) {
    /* istanbul ignore next */
    next(e);
  }
});

// handle company limit
SurveyTheme.schema.post('save', async function (next) {
  try {
    if (this._limit) await handleLimit(this._limit);
  } catch (e) {
    return next(e);
  }
});

// Clear Cloudinary Images
SurveyTheme.schema.pre('remove', async function (next) {
  try {
    await Promise.all([
      // clear background image
      _clearCloudinary(this, 'bgImgCloudinary'),
      _clearCloudinary(this, 'draftData.bgImgCloudinary'),
      // clear logo image
      _clearCloudinary(this, 'logo'),
      _clearCloudinary(this, 'draftData.logo')
    ]);

    next();
  } catch (e) {
    /* istanbul ignore next */
    next(e);
  }
});

// get clone
SurveyTheme.schema.methods.getClone = async function({ session, user, survey }) {
  try {
    const { companyId: company, currentTeam: team } = user;

    const clone = new SurveyTheme.model({
      ..._.omit(this.toObject(), ['_id', 'draftData', 'bgImgCloudinary', 'logo']),
      type: 'survey',
      survey,
      company,
      team
    });

    // clone img cloudinary if exist
    if (this.bgImgCloudinary && this.bgImgCloudinary.secure_url) {
      clone.bgImgCloudinary = await CloudinaryUploader.uploadImage({
        company: clone.company,
        encodedFile: this.bgImgCloudinary.secure_url,
        entity: clone,
        actionName: 'surveyBackground'
      })
        .catch(console.log);
    }

    if (this.logo && this.logo.secure_url) {
      clone.logo = await CloudinaryUploader.uploadImage({
        company: clone.company,
        encodedFile: this.logo.secure_url,
        entity: clone,
        actionName: 'surveyLogo'
      })
        .catch(console.log);
    }

    clone._req_user = user;

    await clone.save({ session });
  } catch (e) {
    return Promise.reject(e);
  }
};

// apply draft
SurveyTheme.schema.methods.applyDraft = async function(options = {}) {
  try {
    if (_.get('draftData.bgImgCloudinary')) await _clearCloudinary(this, 'bgImgCloudinary');
    if (_.get('draftData.logo')) await _clearCloudinary(this, 'logo');

    _.merge(this, this.draftData);

    this.draftData = {};
    this.markModified('draftData');

    await this.save(options);
  } catch (e) {
    return Promise.reject(e);
  }
};

// close draft
SurveyTheme.schema.methods.closeDraft = async function(options = {}) {
  try {
    await Promise.all([
      _clearCloudinary(this, 'draftData.bgImgCloudinary'),
      _clearCloudinary(this, 'draftData.logo')
    ]);

    this.draftData = {};
    this.markModified('draftData');

    await this.save(options);
  } catch (e) {
    return Promise.reject(e);
  }
};

SurveyTheme.schema.methods.saveLogo = async function(path = '') {
  try {
    const logo = _.get(this, `${path}_logo`);

    // clear logo
    if (logo === null) {
      _.set(this, `${path}logo`, undefined);

      // clear logo image
      await _clearCloudinary(this, `${path}logo`);
    }

    // if it is base64 upload new logo
    if (_.isString(logo)) {
      const cloudinaryResponse = await CloudinaryUploader
        .uploadImage({
          company: this.company,
          encodedFile: logo,
          entity: this,
          actionName: 'surveyLogo'
        });

      _.set(this, `${path}logo`, cloudinaryResponse);

      // clear old logo image
      await _clearCloudinary(this, `${path}_oldLogo`);

      _.unset(this, `${path}_logo`);
    }

    // clone cloudinary
    if (_.isObject(logo) && logo.secure_url && (logo.public_id !== _.get(this, `${path}_oldLogo.public_id`))) {
      const cloudinaryResponse = await CloudinaryUploader
        .uploadImage({
          company: this.company,
          encodedFile: logo.secure_url,
          entity: this,
          actionName: 'surveyLogo'
        });

      _.set(this, `${path}logo`, cloudinaryResponse);

      // clear old logo image
      await _clearCloudinary(this, `${path}_oldLogo`);
    }
  } catch (e) {
    return Promise.reject(e);
  }
};

SurveyTheme.schema.methods.saveBackground = async function(path = '') {
  try {
    const bgImgType = _.get(this, `${path}bgImgType`);
    const bgImgCloudinary = _.get(this, `${path}_bgImgCloudinary`);
    const isModifiedBgImgType = this.isModified(`${path}bgImgType`);

    // clear background
    if (isModifiedBgImgType && bgImgType === 'none') {
      _.set(this, `${path}bgImgCloudinary`, undefined);
      _.set(this, `${path}bgImgUrl`, undefined);

      await _clearCloudinary(this, `${path}_oldBgImgCloudinary`);
    }

    // change to unsplash
    if (isModifiedBgImgType && bgImgType === 'unsplash') {
      _.set(this, `${path}bgImgCloudinary`, undefined);

      await _clearCloudinary(this, `${path}_oldBgImgCloudinary`);
    }

    // change to cloudinary
    if (isModifiedBgImgType && bgImgType === 'cloudinary') {
      _.set(this, `${path}bgImgUrl`, undefined);
    }

    // upload new cloudinary background
    if (_.isString(bgImgCloudinary)) {
      const cloudinaryResponse = await CloudinaryUploader
        .uploadImage({
          company: this.company,
          encodedFile: bgImgCloudinary,
          entity: this,
          actionName: 'surveyBackground'
        });

      _.set(this, `${path}bgImgCloudinary`, cloudinaryResponse);

      // clear old logo image
      await _clearCloudinary(this, `${path}_oldBgImgCloudinary`);

      _.unset(this, `${path}_bgImgCloudinary`);
    }

    // clone cloudinary
    if (_.isObject(bgImgCloudinary) && bgImgCloudinary.secure_url && (bgImgCloudinary.public_id !== _.get(this, `${path}_oldBgImgCloudinary.public_id`))) {
      const cloudinaryResponse = await CloudinaryUploader
        .uploadImage({
          company: this.company,
          encodedFile: bgImgCloudinary.secure_url,
          entity: this,
          actionName: 'surveyBackground'
        });

      _.set(this, `${path}bgImgCloudinary`, cloudinaryResponse);

      // clear old background image
      await _clearCloudinary(this, `${path}_oldBgImgCloudinary`);
    }
  } catch (e) {
    return Promise.reject(e);
  }
};

async function _clearCloudinary (obj, field) {
  const publicId = _.get(obj, `${field}.public_id`);

  if (publicId) {
    await CloudinaryUploader.cleanUp({ public_id: publicId });
  }
}

/**
 * Registration
 */
SurveyTheme.register();

export default SurveyTheme;
