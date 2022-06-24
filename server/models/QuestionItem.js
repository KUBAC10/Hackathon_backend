import _ from 'lodash';
import keystone from 'keystone';
import uniqueValidator from 'mongoose-unique-validator';

// helpers
import { localizeField } from '../../config/localization';
import applySoftDelete from '../helpers/softDelete';
import applySetTrashStage from '../helpers/setTrashStage';
import applyTranslateMethod from '../helpers/applyTranslateMethod';
import handleDraftTranslation from '../helpers/handleDraftTranslation';
import { abortTransaction } from '../helpers/transactions';
import handleSortableId from '../helpers/handleSortableId';
import { checkLimit, handleLimit } from '../helpers/limitation';

// services
import CloudinaryUploader from '../services/CloudinaryUploader';

const Types = keystone.Field.Types;

export const iconTypes = [
  'none',
  'phone',
  'cam',
  'laptop',
  'watch',
  'scissors',
  'hand',
  'gear',
  'mouse',
  'crop',
  'flag',
  'disketteR',
  'disketteL',
  'palette',
  'gamepad',
  'text',
  'sandWatch',
  'clapper',
  'bucket',
  'crystal',
  'monitor',
  'gift',
  'pig',
  'cal',
  'lock',
  'picture',
  'pin',
  'eyedropper',
  'money',
  'clip',
  'heart',
  'bell',
  'pen',
  'key',
  'pencil',
  'bulb',
  'book',
  'star',
  'geoPin',
  'pie',
  'rocket',
  'sign',
  'clock',
  'smiley1',
  'smiley2',
  'smiley3',
  'smiley4',
  'smiley5',
];

/**
 * Question Item Model
 * ===================
 */
const QuestionItem = new keystone.List('QuestionItem', {
  track: true,
  defaultSort: '-createdAt'
});

QuestionItem.add({
  inDraft: {
    type: Boolean
  },
  draftRemove: {
    type: Boolean
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    required: true,
    initial: true
  },
  team: {
    type: Types.Relationship,
    ref: 'Team',
    required: true,
    initial: true
  },
  question: {
    type: Types.Relationship,
    ref: 'Question',
    required: true,
    initial: true
  },
  inTrash: {
    type: Boolean,
    default: false
  },
  sortableId: {
    type: Number,
    default: 0,
    note: 'For valid items sorting'
  },
  score: {
    type: Number,
    default: 0
  },
  // image choice config
  dataType: {
    type: Types.Select,
    options: ['cloudinary', 'unsplash', 'gallery', 'none'],
    initial: true,
    default: 'none'
  },
  giphyId: {
    type: String
  },
  unsplashUrl: {
    type: String
  },
  icon: {
    type: Types.Select,
    options: iconTypes,
    default: 'none'
  },
  bgImage: {
    type: String
  },
  imgCloudinary: {
    type: Types.CloudinaryImage,
    initial: true,
    autoCleanup: true,
    folder(item) {
      /* istanbul ignore next */
      return `${item.company}/${item.team}/question-item/${item._id}`;
    },
    note: 'For image choice question type'
  },
  // quiz config
  quizCorrect: {
    type: Boolean,
    note: 'Is quiz answer correct'
  },
  deselectOtherOptions: {
    type: Boolean
  }
}, 'Localization', {
  name: localizeField('general.name'),
  translationLock: localizeField('general.translationLock'),
  quizResultText: localizeField('general.name'),
  quizResultTextTranslationLock: localizeField('general.translationLockName')
});

QuestionItem.schema.add({ draftData: { type: Object } });

QuestionItem.schema.post('init', function () {
  this._oldThis = this.toObject();
});

// check company limit
QuestionItem.schema.pre('save', async function (next) {
  try {
    if (this.isNew) await checkLimit(this);
  } catch (e) {
    return next(e);
  }
});

// handle draft translation
QuestionItem.schema.pre('save', async function (next) {
  try {
    if (this.draftRemove !== true) {
      handleDraftTranslation(this);
    }
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// handle sortableId
QuestionItem.schema.pre('save', async function (next) {
  try {
    await handleSortableId(this, QuestionItem);

    next();
  } catch (e) {
    return next(e);
  }
});

//  handle draft data cloudinary
QuestionItem.schema.pre('save', async function (next) {
  try {
    if (!this.isNew && this.isModified('draftData.imgCloudinary')) {
      const imgCloudinary = _.get(this, 'draftData.imgCloudinary');

      if (typeof imgCloudinary === 'string') {
        const newImgCloudinary = await CloudinaryUploader.uploadImage({
          company: this.company,
          encodedFile: imgCloudinary,
          entity: this,
          actionName: 'questionItem'
        });

        _.set(this, 'draftData.imgCloudinary', newImgCloudinary);

        const public_id = _.get(this, 'draftData.imgCloudinary.public_id');
        const oldPublic_id = _.get(this, '_oldThis.draftData.imgCloudinary.public_id');

        // remove old cloudinary image
        if (oldPublic_id && oldPublic_id !== public_id) {
          await CloudinaryUploader.cleanUp({ public_id: oldPublic_id });
        }
      }
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// clone cloudinary link on upload from json
QuestionItem.schema.pre('save', async function (next) {
  try {
    // clone img cloudinary if exist
    if (this._uploadSurvey && this.imgCloudinary && this.imgCloudinary.secure_url) {
      this.imgCloudinary = await CloudinaryUploader.uploadImage({
        company: this.company,
        encodedFile: this.imgCloudinary.secure_url,
        entity: this,
        actionName: 'questionItem'
      })
        .catch(console.log);
    }
  } catch (e) {
    return next(e);
  }
});

// handle cloudinary images when STRING type on save
QuestionItem.schema.pre('save', async function (next) {
  try {
    const { _imgCloudinary } = this;

    // upload new cloudinary image
    if (typeof _imgCloudinary === 'string') {
      this.imgCloudinary = await CloudinaryUploader.uploadImage({
        company: this.company,
        encodedFile: _imgCloudinary,
        entity: this,
        actionName: 'questionItem'
      });
    }

    const public_id = _.get(this, 'imgCloudinary.public_id');
    const oldPublic_id = _.get(this, '_oldThis.imgCloudinary.public_id');

    // remove old cloudinary image
    if (
      (oldPublic_id && oldPublic_id !== public_id) ||
      (this.imgCloudinary.secure_url && this.dataType !== 'cloudinary')
    ) {
      await CloudinaryUploader.cleanUp({ public_id: oldPublic_id });
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// clear unnecessary fields related to dataType
QuestionItem.schema.pre('save', async function (next) {
  try {
    const fieldsToClear = {
      cloudinary: ['imgCloudinary'],
      gallery: ['bgImage', 'icon'],
      unsplash: ['unsplashUrl'],
    };

    const _clearFields = filterObj => _.forEach(filterObj, (filter) => {
      _.forEach(filter, field => (this[field] = undefined));
    });

    switch (this.dataType) {
      case 'cloudinary':
        _clearFields(_.omit(fieldsToClear, ['cloudinary']));
        break;

      case 'gallery':
        _clearFields(_.omit(fieldsToClear, ['gallery']));
        break;

      case 'unsplash':
        _clearFields(_.omit(fieldsToClear, ['unsplash']));
        break;

      default:
        _clearFields(fieldsToClear);
    }
  } catch (e) {
    next(e);
  }
});

// handle company limit
QuestionItem.schema.post('save', async function (next) {
  try {
    if (this._limit) await handleLimit(this._limit);
  } catch (e) {
    return next(e);
  }
});

// clear cloudinary
QuestionItem.schema.pre('remove', async function(next) {
  try {
    const public_id = _.get(this, 'imgCloudinary.public_id');
    const draftPublic_id = _.get(this, 'draftData.imgCloudinary.public_id');

    if (public_id) await CloudinaryUploader.cleanUp({ public_id });

    if (draftPublic_id) await CloudinaryUploader.cleanUp({ public_id: draftPublic_id });

    next();
  } catch (e) {
    return next(e);
  }
});

// soft delete
QuestionItem.schema.methods.softDelete = applySoftDelete('questionItem');
QuestionItem.schema.methods.setTrashStage = applySetTrashStage('questionItem');

// translate
QuestionItem.schema.methods.translate = applyTranslateMethod();

// TODO: Add indexes
QuestionItem.schema.index({ question: 1 });
// QuestionItem.schema.index({ unlink: 1, question: 1 }); // unlink: { $ne: true } - slow down query

QuestionItem.schema.plugin(uniqueValidator, { message: 'This {PATH} has already been taken' });

/**
 * Registration
 */
QuestionItem.defaultColumns = 'name.en name.de company team question createdAt';
QuestionItem.register();

export default QuestionItem;
