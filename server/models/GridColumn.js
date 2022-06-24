import keystone from 'keystone';

// config
import { localizeField } from '../../config/localization';

// helpers
import applySoftDelete from '../helpers/softDelete';
import applySetTrashStage from '../helpers/setTrashStage';
import applyTranslateMethod from '../helpers/applyTranslateMethod';
import { abortTransaction } from '../helpers/transactions';
import handleDraftTranslation from '../helpers/handleDraftTranslation';
import handleSortableId from '../helpers/handleSortableId';
import { checkLimit, handleLimit } from '../helpers/limitation';

const Types = keystone.Field.Types;

/**
 * GridColumn Model
 * ================
 */
const GridColumn = new keystone.List('GridColumn', {
  track: true,
  defaultSort: '-createdAt'
});

GridColumn.add({
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
    default: 0,
    note: 'For matrix questions'
  }
}, 'Localization', {
  name: localizeField('general.name'),
  translationLock: localizeField('general.translationLock')
});

GridColumn.schema.add({ draftData: { type: Object } });

// check company limit
GridColumn.schema.pre('save', async function (next) {
  try {
    if (this.isNew) await checkLimit(this);
  } catch (e) {
    return next(e);
  }
});

// handle draft translation
GridColumn.schema.pre('save', async function (next) {
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
GridColumn.schema.pre('save', async function (next) {
  try {
    await handleSortableId(this, GridColumn);

    next();
  } catch (e) {
    return next(e);
  }
});

// handle company limit
GridColumn.schema.post('save', async function (next) {
  try {
    if (this._limit) await handleLimit(this._limit);
  } catch (e) {
    return next(e);
  }
});

// soft delete
GridColumn.schema.methods.softDelete = applySoftDelete('gridColumn');
GridColumn.schema.methods.setTrashStage = applySetTrashStage('gridColumn');

// translate
GridColumn.schema.methods.translate = applyTranslateMethod();

/**
 * Registration
 */
GridColumn.defaultColumns = 'name.en name.de company team question';
GridColumn.register();

export default GridColumn;
