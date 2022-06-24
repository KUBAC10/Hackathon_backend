import keystone from 'keystone';
import async from 'async';
import _ from 'lodash';

import { localizeField } from '../../config/localization';

// services
import CloudinaryUploader from '../services/CloudinaryUploader';

// helpers
import applyTranslateMethod from '../helpers/applyTranslateMethod';
import handleDraftTranslation from '../helpers/handleDraftTranslation';
import applySoftDelete from '../helpers/softDelete';
import applySetTrashStage from '../helpers/setTrashStage';
import handleSortableId from '../helpers/handleSortableId';
import { checkLimit, handleLimit } from '../helpers/limitation';
import applyDraftData from '../helpers/applyDraftData';

// models
import { ContentItemElement } from './';

const Types = keystone.Field.Types;

const contentTypes = [
  'title',
  'text',
  'titleText',
  'image',
  'contentImage',
  'textImage',
  'video',
  'textVideo',
  'line',
  'socialIcons',
  'html'
];

/**
 * ContentItem Model
 * ===========
 */

const ContentItem = new keystone.List('ContentItem', {
  track: true,
  defaultSort: '-createdAt'
});

ContentItem.add({
  inDraft: {
    type: Boolean
  },
  draftRemove: {
    type: Boolean
  },
  inTrash: {
    type: Boolean,
    initial: false,
    default: false
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
  survey: {
    type: Types.Relationship,
    ref: 'Survey',
    initial: true,
    required: true
  },
  surveyItem: {
    type: Types.Relationship,
    ref: 'SurveyItem'
  },
  sortableId: {
    type: Number,
    default: 0
  },
  required: {
    type: Boolean
  },
  type: {
    type: Types.Select,
    options: ['content', 'startPage', 'endPage'],
    initial: true,
    required: true
  },
  contentType: {
    type: Types.Select,
    options: contentTypes,
    initial: true,
    required: true
  },
  dataType: {
    type: Types.Select,
    options: ['cloudinary', 'unsplash', 'vimeo', 'youtube', 'none'],
    initial: true,
    default: 'none'
  },
  position: {
    type: Types.Select,
    options: ['default', 'reverse', 'full', 'column']
  },
  imgCloudinary: {
    type: Types.CloudinaryImage,
    initial: true,
    autoCleanup: true,
    folder(item) {
      /* istanbul ignore next */
      return `${item.company}/${item.team}/content-item/${item._id}`;
    },
    note: 'For image type'
  },
  dataUrl: {
    type: String
  },
  autoplay: {
    type: Boolean
  },
  padding: {
    type: String
  },
  fill: {
    type: String
  },
  reverse: {
    type: Boolean
  },
  default: {
    type: Boolean
  },
  bgDefault: {
    type: Boolean
  },
  socialIcons: {
    type: Boolean
  },
  score: {
    type: Boolean
  },
  scorePoints: {
    type: Boolean
  },
  thumbUp: {
    type: Boolean
  },
  passTimeActive: {
    type: Boolean,
    default: false
  }
}, 'Localization', {
  text: localizeField('contentItem.text'),
  title: localizeField('contentItem.text'),
  html: localizeField('contentItem.html'),
  passTimeLabel: localizeField('contentItem.text')
});

ContentItem.schema.post('init', function () {
  _.set(this, 'draftData._oldImgCloudinary', _.get(this.toObject(), 'draftData.imgCloudinary'));
});

ContentItem.schema.add({ draftData: { type: Object } });

ContentItem.schema.add({ externalLinks:
  [{
    _id: {
      type: String
    },
    value: {
      type: String
    },
    link: {
      type: String
    },
    linkText: localizeField('contentItem.linkText')
  }]
});

ContentItem.schema.virtual('contentItemElements', {
  ref: 'ContentItemElement',
  localField: '_id',
  foreignField: 'contentItem'
});

ContentItem.schema.virtual('flowItem', {
  ref: 'FlowItem',
  localField: '_id',
  foreignField: 'endPage',
  justOne: true
});

// check company limit
ContentItem.schema.pre('save', async function (next) {
  try {
    if (this.isNew) await checkLimit(this);
  } catch (e) {
    return next(e);
  }
});

// handle draft translation
ContentItem.schema.pre('save', async function (next) {
  try {
    handleDraftTranslation(this);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
});

// clone cloudinary link on upload from json
ContentItem.schema.pre('save', async function (next) {
  try {
    // clone img cloudinary if exist
    if (this._uploadSurvey && this.imgCloudinary && this.imgCloudinary.secure_url) {
      this.imgCloudinary = await CloudinaryUploader.uploadImage({
        company: this.company,
        encodedFile: this.imgCloudinary.secure_url,
        entity: this,
        actionName: 'content'
      })
        .catch(console.log);
    }
  } catch (e) {
    return next(e);
  }
});

ContentItem.schema.pre('save', async function(next) {
  try {
    if (this.isNew && this.dataType === 'cloudinary' && _.isString(this.dataUrl) && !this._uploadSurvey) {
      // get image
      const encodedFile = this.dataUrl;

      // clear image from dataUrl
      this.dataUrl = undefined;

      // upload image to cloudinary
      const cloudinaryResponse = await CloudinaryUploader
        .uploadImage({
          company: this.company,
          encodedFile,
          entity: this,
          actionName: 'content'
        });

      // set cloudinary to draft data
      _.set(this, 'draftData.imgCloudinary', cloudinaryResponse);
    }

    next();
  } catch (e) {
    return next(e);
  }
});

ContentItem.schema.pre('save', async function (next) {
  try {
    if (!this.isNew && this.draftData) {
      const dataType = _.get(this, 'draftData.dataType', this.dataType);

      // clear image and url
      if (dataType === 'none') {
        this.draftData.dataUrl = undefined;

        if (this.draftData.imgCloudinary) {
          await CloudinaryUploader.cleanUp({ public_id: this.draftData.imgCloudinary.public_id });
        }
      }

      // update/upload cloudinary image and clear old
      if (dataType === 'cloudinary' && _.isString(this.draftData.dataUrl)) {
        // get image
        const encodedFile = this.draftData.dataUrl;

        // clear image from dataUrl
        this.draftData.dataUrl = undefined;

        // clear old image if exist
        if (this.draftData._oldImgCloudinary && encodedFile) {
          await CloudinaryUploader
            .cleanUp({ public_id: this.draftData._oldImgCloudinary.public_id });

          this.draftData._oldImgCloudinary = undefined;
        }

        // upload image to cloudinary
        const cloudinaryResponse = await CloudinaryUploader
          .uploadImage({
            company: this.company,
            encodedFile,
            entity: this,
            actionName: 'content'
          });

        _.set(this, 'draftData.imgCloudinary', cloudinaryResponse);

        this.markModified('draftData.imgCloudinary');
      }
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// handle sortableId
ContentItem.schema.pre('save', async function (next) {
  try {
    await handleSortableId(this, ContentItem);

    next();
  } catch (e) {
    return next(e);
  }
});

// handle company limit
ContentItem.schema.post('save', async function (next) {
  try {
    if (this._limit) await handleLimit(this._limit);
  } catch (e) {
    return next(e);
  }
});

// clear images if exist
ContentItem.schema.pre('remove', async function(next) {
  try {
    if (_.get(this, 'imgCloudinary.public_id')) {
      await CloudinaryUploader.cleanUp({ public_id: this.imgCloudinary.public_id });
    }

    if (_.get(this, 'draftData.imgCloudinary.public_id')) {
      await CloudinaryUploader.cleanUp({ public_id: this.draftData.imgCloudinary.public_id });
    }
  } catch (e) {
    return next(e);
  }
});

// apply draft
ContentItem.schema.methods.applyDraft = async function(options = {}) {
  try {
    const { ContentItemElement } = keystone.lists;

    const draftPublicId = _.get(this, 'draftData.imgCloudinary.public_id');
    const public_id = _.get(this, 'imgCloudinary.public_id');

    if (draftPublicId && public_id) await CloudinaryUploader.cleanUp({ public_id });

    // apply draft data on content item elements
    const [
      contentItemElements
    ] = await Promise.all([
      ContentItemElement.model.find({ contentItem: this._id, draftRemove: { $ne: true } }),
      // remove
      ContentItemElement.model.deleteMany({ contentItem: this._id, draftRemove: true }, options)
    ]);

    // apply content item elements
    await async.eachLimit(contentItemElements, 5, (item, cb) => {
      applyDraftData(item);

      item.markModified('draftData');
      item.save(options)
        .then(() => cb())
        .catch(cb);
    });

    applyDraftData(this);

    this.draftData = {};
    this.inDraft = false;
    this.markModified('draftData');

    await this.save(options);
  } catch (e) {
    return Promise.reject(e);
  }
};

// close draft
ContentItem.schema.methods.closeDraft = async function(options = {}) {
  try {
    if (this.inDraft) return await this.softDelete(options);

    const public_id = _.get(this, 'draftData.imgCloudinary.public_id');

    if (public_id) await CloudinaryUploader.cleanUp({ public_id });

    this.draftData = {};
    this.draftRemove = false;
    this.markModified('draftData');

    await this.save(options);
  } catch (e) {
    return Promise.reject(e);
  }
};

// apply translate method
ContentItem.schema.methods.translate = applyTranslateMethod();

// soft delete
ContentItem.schema.methods.softDelete = applySoftDelete('contentItem');
ContentItem.schema.methods.setTrashStage = applySetTrashStage('contentItem');

// get clone
ContentItem.schema.methods.getClone = async function ({ session, user, ids = {}, draftClone }) {
  try {
    const { companyId: company, currentTeam: team } = user;
    const { sortableId, survey, surveyItem } = this;

    const clone = new ContentItem.model({
      ..._.omit(this.toObject(), ['_id', 'draftRemove', 'question', 'survey', 'imgCloudinary']),
      company,
      team,
      draftRemove: false,
      survey: draftClone ? survey : ids[survey],
      surveyItem: draftClone ? surveyItem : ids[surveyItem],
      sortableId: draftClone ? sortableId + 1 : sortableId,
      inDraft: draftClone,
      default: draftClone === true ? false : this.default,
      draftData: draftClone === true ? { ...this.draftData, default: false } : this.draftData
    });

    // clone img cloudinary if exist
    if (this.imgCloudinary && this.imgCloudinary.secure_url) {
      clone.imgCloudinary = await CloudinaryUploader.uploadImage({
        company: clone.company,
        encodedFile: this.imgCloudinary.secure_url,
        entity: clone,
        actionName: 'content'
      })
        .catch(console.log);
    }

    clone._req_user = user;

    const { _id } = await clone.save({ session });

    if (clone.type === 'endPage') ids[this._id] = _id;

    // clone content item elements
    const elements = await ContentItemElement.model.find({ contentItem: this._id });

    await async.eachLimit(elements, 5, (element, cb) => {
      const cloneElement = new ContentItemElement.model({
        ..._.omit(element, '_id'),
        contentItem: _id,
        company,
        team
      });

      cloneElement._req_user = user;

      cloneElement.save({ session })
        .then(() => cb())
        .catch(cb);
    });

    return clone._id;
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Registration
 */
ContentItem.defaultColumns = 'type company team';
ContentItem.register();

export default ContentItem;
