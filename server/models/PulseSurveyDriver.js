import _ from 'lodash';
import async from 'async';
import keystone from 'keystone';

// helpers
import applyTranslateMethod from '../helpers/applyTranslateMethod';
import handleSortableId from '../helpers/handleSortableId';

const Types = keystone.Field.Types;

/**
 * PulseSurveyDriver Model
 * ============
 */

export const iconTypes = [
  'achievement',
  'responsibility',
  'conditions',
  'advancement',
  'growth',
  'supervision',
  'workItself',
  'policy',
  'relations',
  'recognition',
  'benefits',
  'star'
];

const PulseSurveyDriver = new keystone.List('PulseSurveyDriver', {
  track: true,
  defaultSort: 'sortableId'
});

PulseSurveyDriver.add({
  inDraft: {
    type: Boolean
  },
  draftRemove: {
    type: Boolean
  },
  name: {
    type: String
  },
  description: {
    type: String
  },
  icon: {
    type: Types.Select,
    options: iconTypes,
    initial: true,
    required: true,
    default: 'star'
  },
  survey: {
    type: Types.Relationship,
    ref: 'Survey',
    initial: true,
    required: true
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
  active: {
    type: Boolean,
    default: true
  },
  minPositiveValue: {
    type: Number
  },
  maxPositiveValue: {
    type: Number
  },
  primaryPulse: {
    type: Boolean
  },
  factor: {
    type: Types.Select,
    options: ['hygiene', 'motivating']
  },
  sortableId: {
    type: Number
  }
});

PulseSurveyDriver.schema.add({ draftData: { type: Object } });

PulseSurveyDriver.schema.virtual('surveySections', {
  ref: 'SurveySection',
  localField: '_id',
  foreignField: 'pulseSurveyDriver',
  options: {
    sort: { sortableId: 1 },
    match: { inDraft: { $ne: true } }
  }
});

// handle sortable id
PulseSurveyDriver.schema.pre('save', async function (next) {
  try {
    // set sortable id for new driver
    if (this.isNew && (this.sortableId === undefined)) {
      const count = await PulseSurveyDriver.model
        .find({ survey: this.survey })
        .countDocuments();

      this.sortableId = count + 1;
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// handle sortableId
PulseSurveyDriver.schema.pre('save', async function (next) {
  try {
    await handleSortableId(this, PulseSurveyDriver);

    next();
  } catch (e) {
    return next(e);
  }
});


// translate
PulseSurveyDriver.schema.methods.translate = applyTranslateMethod();

// duplicate pulse survey driver and all related entities
PulseSurveyDriver.schema.methods.duplicate = async function ({ ids = {}, session, user }) {
  try {
    const { SurveySection, SurveyItem } = keystone.lists;

    // clone pulse survey driver
    const clone = new PulseSurveyDriver.model({
      ..._.omit(this.toObject(), ['_id'])
    });

    _.set(clone, 'draftData.sortableId', this.sortableId);

    clone._driverDuplicate = this._driverDuplicate;

    await clone.save({ session });

    ids[this._id] = clone._id;

    const allSections = await SurveySection.model
      .find({
        draftRemove: { $ne: true },
        survey: this.survey,
      })
      .lean();

    const [lastSection] = allSections
      .map(section => ({ ...section, ...section.draftData || {} }))
      .sort((a, b) => b.sortableId - a.sortableId);

    // load related survey sections
    let surveySections = await SurveySection.model
      .find({
        draftRemove: { $ne: true },
        survey: this.survey,
        pulseSurveyDriver: this._id
      })
      .lean();

    let index = 1;

    surveySections = surveySections
      .map(section => ({ ...section, ...section.draftData || {} }))
      .sort((a, b) => a.sortableId - b.sortableId);

    // create new sections
    for (const section of surveySections) {
      const sortableId = index + lastSection.sortableId;

      const newSection = new SurveySection.model({
        ..._.omit(section, ['_id', 'sortableId']),
        sortableId,
        draftData: { sortableId },
        pulseSurveyDriver: clone._id
      });

      newSection.markModified('draftData');
      newSection._skipHandleSortableId = true;

      await newSection.save({ session });

      // set new section ids
      ids[section._id] = newSection._id;

      index += 1;
    }

    // load related survey items
    const surveyItems = await SurveyItem.model
      .find({
        inTrash: { $ne: true },
        draftRemove: { $ne: true },
        surveySection: {
          $in: surveySections.map(section => section._id)
        }
      });

    await async.eachLimit(surveyItems, 5, (surveyItem, cb) => {
      surveyItem.pulseSurveyDriver = clone.id;
      surveyItem._skipHandleSortableId = true;
      surveyItem.surveySection = ids[surveyItem.surveySection];
      surveyItem.getClone({ session, ids, user, draftClone: true })
        .then(() => cb())
        .catch(cb);
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Registration
 */
PulseSurveyDriver.defaultColumns = 'name surveySection';
PulseSurveyDriver.register();

export default PulseSurveyDriver;
