import keystone from 'keystone';

// helpers
import {
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
} from '../helpers/transactions';
import applyTranslateMethod from '../helpers/applyTranslateMethod';
import handleSortableId from '../helpers/handleSortableId';
import { checkLimit, handleLimit } from '../helpers/limitation';

// config
import { localizeField } from '../../config/localization';
import handleDraftTranslation from '../helpers/handleDraftTranslation';

const Types = keystone.Field.Types;

/**
 * SurveySection Model
 * ==================
 */
const SurveySection = new keystone.List('SurveySection', {
  track: true
});

SurveySection.add({
  inDraft: {
    type: Boolean
  },
  draftRemove: {
    type: Boolean
  },
  survey: {
    type: Types.Relationship,
    ref: 'Survey',
    initial: true,
    required: true
  },
  hide: {
    type: Boolean,
    default: false
  },
  primaryPulse: {
    type: Boolean
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true,
    required: true
  },
  team: {
    type: Types.Relationship,
    ref: 'Team',
    initial: true,
    required: true
  },
  sortableId: {
    type: Number,
    default: 0,
    note: 'For valid items sorting and sortableId === surveyStep'
  },
  step: {
    type: Number
  },
  displaySingle: {
    type: Types.Boolean,
    note: 'Display single question over screen in section'
  },
  pulseSurveyDriver: {
    type: Types.Relationship,
    ref: 'PulseSurveyDriver'
  },
  pulseParent: {
    type: Types.Relationship,
    ref: 'SurveySection'
  }
}, 'Localization', {
  name: localizeField('general.name'),
  description: localizeField('general.description')
});

SurveySection.schema.add({ draftData: { type: Object } });

SurveySection.schema.virtual('surveyItems', {
  ref: 'SurveyItem',
  localField: '_id',
  foreignField: 'surveySection',
  options: { sort: { sortableId: 1 }, match: { inTrash: { $ne: true }, inDraft: { $ne: true } } }
});

// start save session
SurveySection.schema.pre('save', async function (next) {
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

// check company limit
SurveySection.schema.pre('save', async function (next) {
  try {
    if (this.isNew) await checkLimit(this);
  } catch (e) {
    return next(e);
  }
});

// handle draft translation
SurveySection.schema.pre('save', async function (next) {
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
SurveySection.schema.pre('save', async function (next) {
  try {
    await handleSortableId(this, SurveySection);

    next();
  } catch (e) {
    return next(e);
  }
});

// commit save session
SurveySection.schema.pre('save', async function (next) {
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

// handle company limit
SurveySection.schema.post('save', async function (next) {
  try {
    if (this._limit) await handleLimit(this._limit);
  } catch (e) {
    return next(e);
  }
});

//  change sortable id for not hidden sections\
//  TODO: implement after sortableId fix
/*
SurveySection.schema.pre('save', async function (next) {
  try {
    if (this.isModified('hide') && this.hide === true) {
      const { SurveySection } = keystone.lists;

      const surveySections = await SurveySection.model
        .find({
          survey: this.survey,
          hide: { $ne: true },
          inTrash: { $ne: true },
          inDraft: { $ne: true }
        })
        .sort('sortableId');
      await async.eachOfLimit(surveySections, 5, (section, index, cb) => {
        section.sortableId = index;
        section.save()
          .then(() => cb())
          .catch(cb);
      });
    }
    next();
  } catch (e) {
    return next(e);
  }
});
*/

// translate
SurveySection.schema.methods.translate = applyTranslateMethod();

/**
 * Registration
 */
SurveySection.defaultColumns = 'name.en name.de survey';
SurveySection.register();

export default SurveySection;
