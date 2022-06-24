import keystone from 'keystone';

// config
import { localizeField } from '../../config/localization';
import applyTranslateMethod from '../helpers/applyTranslateMethod';
import handleDraftTranslation from '../helpers/handleDraftTranslation';

const Types = keystone.Field.Types;

/**
 * ContentItemElement Model
 * ===========
 */

const ContentItemElement = new keystone.List('ContentItemElement', {
  track: true,
  defaultSort: '-createdAt'
});

ContentItemElement.add({
  inDraft: {
    type: Boolean
  },
  draftRemove: {
    type: Boolean
  },
  contentItem: {
    type: Types.Relationship,
    ref: 'ContentItem',
    initial: true,
    require: true
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true,
    require: true
  },
  team: {
    type: Types.Relationship,
    ref: 'Team',
    initial: true,
    require: true
  },
  type: {
    type: Types.Select,
    options: ['link'],
    initial: true,
    required: true
  },
  value: {
    type: String
  },
  link: {
    type: String
  }
}, 'Localization', {
  linkText: localizeField('contentItem.text')
});

ContentItemElement.schema.add({ draftData: { type: Object } });

// handle draft translation
ContentItemElement.schema.pre('save', async function (next) {
  try {
    handleDraftTranslation(this);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
});

// apply translate method
ContentItemElement.schema.methods.translate = applyTranslateMethod();

/**
 * Registration
 */

ContentItemElement.defaultColumns = 'contentItem company type';
ContentItemElement.register();

export default ContentItemElement;
