import keystone from 'keystone';
import mongoose from 'mongoose';
import async from 'async';
import _ from 'lodash';
import translate from '../helpers/translate';

// helpers
import {
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
} from '../helpers/transactions';
import applySoftDelete from '../helpers/softDelete';
import applySetTrashStage from '../helpers/setTrashStage';
import applyTranslateMethod from '../helpers/applyTranslateMethod';
import handleDraftTranslation from '../helpers/handleDraftTranslation';
import { checkLimit, handleLimit } from '../helpers/limitation';

// models
import {
  QuestionItem,
  SurveyItem
} from '../models';

// services
import APIMessagesExtractor from '../services/APIMessagesExtractor';

// config
import { localizationList, localizeField } from '../../config/localization';
import cropTranslation from '../helpers/cropTranslation';

const ValidationError = mongoose.Error.ValidationError;
const ValidatorError = mongoose.Error.ValidatorError;

const Types = keystone.Field.Types;

/**
 * Question Model
 * ==============
 */
const Question = new keystone.List('Question', {
  track: true
});

export const questionTypes = ['countryList', 'text', 'multipleChoice', 'checkboxes', 'dropdown', 'linearScale', 'thumbs', 'netPromoterScore', 'slider', 'multipleChoiceMatrix', 'checkboxMatrix', 'imageTriangle', 'imageChoice'];

Question.add(
  {
    // main config
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
    type: {
      type: Types.Select,
      options: questionTypes,
      initial: true,
      required: true
    },
    input: {
      type: Types.Select,
      options: 'number, phone, email, date'
    },
    general: {
      type: Boolean,
      default: false,
      note: 'General questions are reusable in many surveys'
    },
    hideIcons: {
      type: Boolean,
      default: false,
    },
    trend: {
      type: Boolean,
      default: false,
      note: 'Trend questions are reusable questions and own reports'
    },
    isGlobal: {
      type: Boolean,
    },
    defaultCode: {
      type: String,
      default: 'CH'
    },
    defaultLanguage: {
      type: String,
      enum: localizationList,
      default: localizationList[0]
    },
    textComment: { // turn on text comment (custom answer) for net promoter score
      type: Boolean,
      default: false
    },
    randomize: {
      type: Boolean
    },
    verticalAlignment: {
      type: Boolean
    },

    // helpers
    linearScale: {
      from: {
        type: Number
      },
      fromCaption: localizeField('question.fromCaption'),
      to: {
        type: Number
      },
      toCaption: localizeField('question.toCaption'),
      icon: {
        type: Types.Select,
        options: 'ordinary, star, favorite, thumb, button, smiley, crown, trophy, fingers, fire, party, virus, skull, dollar',
        default: 'star'
      }
    },
    dateParams: {
      type: {
        type: Types.Select,
        options: ['date', 'dateAndTime', 'range', 'rangeAndTime'],
        default: 'date'
      },
      dateFormat: {
        type: Types.Select,
        options: ['ddmmyyyy', 'mmddyyyy', 'yyyymmdd'],
        default: 'ddmmyyyy'
      },
      timeFormat: {
        type: Types.Select,
        options: ['twelveHourFormat', 'twentyFourHourFormat'],
        default: 'twelveHourFormat'
      },
      startDate: {
        type: String
      },
      startTime: {
        type: String
      },
      endDate: {
        type: String
      },
      endTime: {
        type: String
      },
      default: {
        type: Boolean,
        default: false
      }
    },

    // turn on multiple choice for image choice type of question
    multipleChoice: {
      type: Boolean,
      default: false
    },

    // remove
    inTrash: {
      type: Boolean,
      initial: false,
      default: false
    },

    // quiz
    quiz: {
      type: Boolean,
      note: 'Flag, if question is could be used in quiz'
    },
    quizCondition: {
      type: Types.Select,
      options: ['equal', 'greaterEqual', 'lessEqual', 'isBetween']
    },
    quizCorrectValue: {
      type: String
    },
    quizCorrectRange: {
      from: {
        type: Number
      },
      to: {
        type: Number
      }
    },
    quizCorrectText: localizeField('general.html'),
    quizIncorrectText: localizeField('general.html'),

    // pulse
    pulse: {
      type: Boolean
    },
    primaryPulse: {
      type: Boolean
    },
    pulseParent: {
      type: Types.Relationship,
      ref: 'Question'
    }
  },
  'Localization', {
    name: localizeField('general.name'),
    placeholder: localizeField('question.placeholder'),
    translation: localizeField('general.translation'),
    description: localizeField('general.description'),
    detractorsComment: localizeField('general.name'),
    detractorsPlaceholder: localizeField('question.placeholder'),
    passivesComment: localizeField('general.name'),
    passivesPlaceholder: localizeField('question.placeholder'),
    promotersComment: localizeField('general.name'),
    promotersPlaceholder: localizeField('question.placeholder'),
    translationLockName: localizeField('general.translationLockName'),
    translationLockDescription: localizeField('general.translationLockDescription'),
    translationLockPlaceholder: localizeField('question.translationLockPlaceholder'),
    translationLockDetractorsComment: localizeField('general.translationLockName'),
    translationLockDetractorsPlaceholder: localizeField('question.translationLockPlaceholder'),
    translationLockPassivesComment: localizeField('general.translationLockName'),
    translationLockPassivesPlaceholder: localizeField('question.translationLockPlaceholder'),
    translationLockPromotersComment: localizeField('general.translationLockName'),
    translationLockPromotersPlaceholder: localizeField('question.translationLockPlaceholder'),
    translationLockLinearScaleFromCaption: localizeField('question.translationLockLinearScaleFromCaption'),
    translationLockLinearScaleToCaption: localizeField('question.translationLockLinearScaleFromCaption'),
    quizCorrectTextTranslationLock: localizeField('general.translationLockName'),
    quizIncorrectTextTranslationLock: localizeField('general.translationLockName'),
  }
);

Question.schema.add({ draftData: { type: Object } });

// for thumbs and linearScale question scoring system
// { [value/yes/no]: score }
Question.schema.add({ scoreObj: { type: Object, default: {} } });

Question.relationship({ path: 'questionItems', ref: 'QuestionItem', refPath: 'question' });
Question.relationship({ path: 'gridRows', ref: 'GridRow', refPath: 'question' });
Question.relationship({ path: 'gridColumns', ref: 'GridColumn', refPath: 'question' });
Question.relationship({ path: 'tagEntities', ref: 'TagEntity', refPath: 'question' });

// virtual relations
Question.schema.virtual('tagEntities', {
  ref: 'TagEntity',
  localField: '_id',
  foreignField: 'question'
});

Question.schema.virtual('questionItems', {
  ref: 'QuestionItem',
  localField: '_id',
  foreignField: 'question',
  options: { sort: { sortableId: 1 }, match: { inTrash: { $ne: true }, inDraft: { $ne: true } } }
});

Question.schema.virtual('gridRows', {
  ref: 'GridRow',
  localField: '_id',
  foreignField: 'question',
  options: { sort: { sortableId: 1 }, match: { inTrash: { $ne: true }, inDraft: { $ne: true } } }
});

Question.schema.virtual('gridColumns', {
  ref: 'GridColumn',
  localField: '_id',
  foreignField: 'question',
  options: { sort: { sortableId: 1 }, match: { inTrash: { $ne: true }, inDraft: { $ne: true } } }
});

Question.schema.virtual('trash', {
  ref: 'Trash',
  localField: '_id',
  justOne: true,
  foreignField: 'question'
});

Question.schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    /* istanbul ignore next */
    delete ret._;
    /* istanbul ignore next */
    return ret;
  }
});

Question.schema.post('init', function () {
  const _this = this.toObject();
  this._oldType = _this.type;
  _.set(this, '_oldDraftData', _this.draftData);
});

// check company limit
Question.schema.pre('save', async function (next) {
  try {
    if (this.isNew) await checkLimit(this);
  } catch (e) {
    return next(e);
  }
});

// validate linearScale question type fields
Question.schema.pre('save', async function (next) {
  try {
    if (this.type === 'linearScale' && !this.linearScale) {
      const error = new ValidationError(this);
      // get error text
      const message = await APIMessagesExtractor.getError(this._lang, 'question.linearScaleRequiredFields');
      error.errors.type = new ValidatorError({ message });
      return next(error);
    }
    next();
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
});

// start session
Question.schema.pre('save', async function (next) {
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

// TODO check on draft apply
// handle required translation
Question.schema.pre('save', async function (next) {
  try {
    if (!localizationList.some(lang => this.translation[lang]) && this._applyDraft) {
      const error = new ValidationError(this);
      // get error text
      const message = await APIMessagesExtractor.getError(this._lang, 'global.translationIsRequired');
      error.errors.translation = new ValidatorError({ message });
      return next(error);
    }

    next();
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// handle question data translation
Question.schema.pre('save', async function (next) {
  try {
    const dataFields = ['name', 'description', 'placeholder', 'linearScale.fromCaption', 'linearScale.toCaption'];
    for (const field of dataFields) {
      if (this.isModified(field) && this._currentTranslation) {
        const currentTranslationLang = Object.keys(this._currentTranslation)[0];
        await _translateField(this, this.translation, field, currentTranslationLang);
      }
    }

    next();
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// handle draft translation
Question.schema.pre('save', async function (next) {
  try {
    if (this.draftRemove !== true && !this._skipHandleDraftTranslation) {
      handleDraftTranslation(this);
    }
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// handle question items
Question.schema.pre('save', async function (next) {
  if (this._questionItems) {
    try {
      const QuestionItem = keystone.lists.QuestionItem;

      // if question item have _id - update it, otherwise create new
      for (const [index, questionItem] of this._questionItems.entries()) {
        if (questionItem._id) {
          const questionItemDoc = await QuestionItem.model
            .findOne({ _id: questionItem._id, question: this._id });

          // if cant load question item - raise error
          if (!questionItemDoc) {
            const error = new ValidationError(this);
            error.errors.question = new ValidatorError({
              message: `Question item: ${questionItem._id} is not belong to question: ${this._id}`
            });
            return next(error);
          }

          // check if item had change name translation
          const currentTranslationLang = Object.keys(this._currentTranslation)[0];
          const translationChanged = questionItem.name[currentTranslationLang]
            !== questionItemDoc.name[currentTranslationLang];

          if (typeof questionItem.imgCloudinary === 'string') {
            // Use _field instead of origin field
            questionItemDoc._imgCloudinary = questionItem.imgCloudinary;
            questionItemDoc.imgCloudinary = undefined;
            questionItem.imgCloudinary = undefined;
          }

          // assign new values
          _.merge(questionItemDoc, questionItem);

          // if item has no lock on translation,
          // translate it to another available language of question
          if (translationChanged) {
            await _translateItem(
              questionItemDoc,
              questionItem,
              this.translation,
              currentTranslationLang
            );
          }

          // set sortableId to each element depending on array index
          questionItemDoc.sortableId = index;

          await questionItemDoc.save({ session: this.currentSession });
        } else {
          const questionItemDoc = new QuestionItem.model({
            ...questionItem,
            team: this.team,
            company: this.company,
            question: this._id
          });

          if (typeof questionItem.imgCloudinary === 'string') {
            // Use _field instead of origin field
            questionItemDoc._imgCloudinary = questionItem.imgCloudinary;
            questionItemDoc.imgCloudinary = undefined;
          }

          // set sortableId to each element depending on array index
          questionItemDoc.sortableId = index;

          // translate options to all base languages
          if (!this._skipTranslation) {
            const currentTranslationLang = Object.keys(this._currentTranslation)[0];

            await _translateItem(
              questionItemDoc,
              questionItem,
              this.translation,
              currentTranslationLang
            );
          }

          await questionItemDoc.save({ session: this.currentSession });
        }
      }

      // soft remove old items, that are not included in new array
      const currentItemsIds = this._questionItems.map(i => i._id).filter(i => !!i);
      const itemsToRemove = await QuestionItem.model
        .find({ _id: { $nin: currentItemsIds }, question: this._id });
      for (const itemToRemove of itemsToRemove) {
        await itemToRemove.softDelete({ session: this.currentSession });
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

// TODO ensure presence []
// handle grid columns and rows
Question.schema.pre('save', async function (next) {
  if (this._grid) {
    try {
      const question = this;
      if (this._grid.gridColumns) {
        await _createGrid(question, this._grid.gridColumns, 'GridColumn', next);
      }
      if (this._grid.gridRows) {
        await _createGrid(question, this._grid.gridRows, 'GridRow', next);
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

// handle linear scale if type is changed
Question.schema.pre('save', async function (next) {
  if (this.isModified('type') && this._oldType === 'linearScale') {
    try {
      this.linearScale = undefined; // TODO tests
    } catch (e) {
      /* istanbul ignore next */
      if (this._innerSession) await abortTransaction(this.currentSession);
      /* istanbul ignore next */
      return next(e);
    }
  }
  next();
});

// handle switch type of question
Question.schema.pre('save', async function (next) {
  try {
    const draftType = _.get(this, 'draftData.type');
    const draftInput = _.get(this, 'draftData.input');
    const oldDraftInput = _.get(this, '_oldDraftData.input');

    if (draftInput !== oldDraftInput && draftInput === 'number') {
      _.set(this, 'linearScale.from', null);
      _.set(this, 'linearScale.to', null);
    }

    if (
      (draftType && this._oldType !== draftType) ||
      (draftInput && draftInput !== oldDraftInput)
    ) {
      const surveyItem = await SurveyItem.model
        .findOne({ question: this._id })
        .populate({
          path: 'flowLogic',
          populate: {
            path: 'flowItems'
          }
        });

      const flowLogic = _.get(surveyItem, 'flowLogic');

      let thumbsItems = [];

      if (surveyItem) {
        _.set(surveyItem, 'draftData.textLimit', null);
        _.set(surveyItem, 'draftData.maxAnswers', null);
        _.set(surveyItem, 'draftData.minAnswers', null);
        _.set(surveyItem, 'draftData.customAnswer', null);

        surveyItem.markModified('draftData');

        await surveyItem.save();
      }

      if (this._oldType === 'thumbs' && (!this._oldDraftData || !this._oldDraftData.type)) {
        const thumbsItem = {
          company: this.company,
          team: this.team,
          name: { [this.draftData.defaultLanguage]: 'Yes' },
          question: this._id,
          inDraft: true,
          draftData: {
            defaultLanguage: this.draftData.defaultLanguage,
            translation: this.draftData.translation
          },
          sortableId: 0
        };

        const itemFirst = new QuestionItem.model({
          ...thumbsItem,
          name: this.linearScale.fromCaption
        });
        const itemSecond = new QuestionItem.model({
          ...thumbsItem,
          name: this.linearScale.toCaption,
          sortableId: 1
        });

        thumbsItems = await Promise.all([
          itemFirst.save(),
          itemSecond.save()
        ]);
      }

      // change type in flow logic
      if (flowLogic) {
        flowLogic.forEach((logicItem) => {
          logicItem.flowItems.forEach(async (flowItem) => {
            // if thumbs has flow items
            if (thumbsItems.length) {
              thumbsItems.forEach((item) => {
                if (flowItem.value === item.name[this.draftData.defaultLanguage]) {
                  flowItem.questionItems = [item._id];
                }
              });
            }

            flowItem.questionType = draftType;

            await flowItem.save();
          });
        });
      }
    }

    return next();
  } catch (e) {
    return next(e);
  }
});

// Clear related entities if question type was changed
Question.schema.pre('save', async function (next) {
  if (this.isModified('type') && !this.isNew && (!_.isEqual(_handleGroupOfTypes(this.type), _handleGroupOfTypes(this._oldType)))) {
    try {
      const error = new ValidationError(this);
      // get error text
      const message = await APIMessagesExtractor.getError(this._lang, 'global.typeSwitchError');
      error.errors.type = new ValidatorError({ message });
      error.errors.meta = {
        model: 'Question',
        type: 'typeSwitchError',
        _id: this._id
      };
      return next(error);
    } catch (e) {
      /* istanbul ignore next */
      if (this._innerSession) await abortTransaction(this.currentSession);
      /* istanbul ignore next */
      return next(e);
    }
  }
  next();
});

// commit session
Question.schema.pre('save', async function (next) {
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
Question.schema.post('save', async function (next) {
  try {
    if (this._limit) await handleLimit(this._limit);
  } catch (e) {
    return next(e);
  }
});

// soft delete for trend/general questions
Question.schema.methods.softDelete = applySoftDelete('question', 'question');

Question.schema.methods.setTrashStage = applySetTrashStage('question');

export async function _translateItem(doc, questionItem, questionTranslations, currentTranslationLang) { // eslint-disable-line
  const questionLangs = Object.keys(questionTranslations.toObject())
    .filter(i => questionTranslations[i]);

  for (const lang of questionLangs) {
    // check if translation is present in item and not locked
    const translationAvailable = questionTranslations[lang] && !doc.translationLock[lang];

    if (lang !== currentTranslationLang && translationAvailable) {
      doc.name[lang] = await translate(questionItem.name[currentTranslationLang],
        { from: currentTranslationLang, to: lang }
      );
    }
  }
}

export async function _translateField(doc, questionTranslations, field, currentTranslationLang) {
  const questionLangs = Object.keys(questionTranslations.toObject())
    .filter(i => questionTranslations[i]);

  for (const lang of questionLangs) {
    const split = _.split(field, '.');
    const loc = split.reduce((acc, f) => acc.concat(_.upperFirst(f)), '');

    // check if translation is not locked
    const translationAvailable = !doc[`translationLock${loc}`][lang];

    if (lang !== currentTranslationLang && translationAvailable) {
      if (split.length === 1) {
        doc[field][lang] = await translate(
          doc[field][currentTranslationLang],
          { from: currentTranslationLang, to: lang }
        );
      }

      if (split.length === 2) {
        doc[split[0]][split[1]][lang] = await translate(
          doc[split[0]][split[1]][currentTranslationLang],
          { from: currentTranslationLang, to: lang }
        );
      }
    }
  }
}

// TODO remove multipleChoiceGrid and checkboxGrid
function _handleGroupOfTypes(type) {
  const groupsOfTypes = [
    ['thumbs', 'checkboxes', 'dropdown', 'multipleChoice', 'countryList'],
    ['text'],
    ['linearScale'],
    ['netPromoterScore'],
    ['slider'],
    ['multipleChoiceMatrix', 'checkboxMatrix', 'multipleChoiceGrid', 'checkboxGrid']
  ];
  return groupsOfTypes.find(group => group.includes(type));
}

// TODO refactor + remove grid
export async function _createGrid(question, grids = [], model, next) {
  const GridModel = keystone.lists[model];
  for (const [index, grid] of grids.entries()) {
    if (grid._id) {
      const gridDoc = await GridModel.model
        .findOne({ _id: grid._id, question: question._id });

      // if cant load question item - raise error
      if (!gridDoc) {
        const error = new ValidationError(question);
        error.errors.question = new ValidatorError({
          message: `Grid: ${grid._id} is not belong to question: ${question._id}`
        });
        return next(error);
      }

      // check if item had change name translation
      const currentTranslationLang = Object.keys(question._currentTranslation)[0];
      const translationChanged = grid.name[currentTranslationLang]
        !== gridDoc.name[currentTranslationLang];

      // assign new values
      _.merge(gridDoc, grid);

      // if item has no lock on translation,
      // translate it to another available language of question
      if (translationChanged) {
        await _translateItem(
          gridDoc,
          grid,
          question.translation,
          currentTranslationLang
        );
      }

      await gridDoc.save({ session: question.currentSession });
    } else {
      const gridDoc = new GridModel.model({
        ...grid,
        team: question.team,
        company: question.company,
        question: question._id
      });

      // set sortableId to each element depending on array index
      gridDoc.sortableId = index;

      // translate options to all base languages
      if (!question._skipTranslation) {
        const currentTranslationLang = Object.keys(question._currentTranslation)[0];

        await _translateItem(
          gridDoc,
          grid,
          question.translation,
          currentTranslationLang
        );
      }
      await gridDoc.save({ session: question.currentSession });
    }
  }

  // remove old items, that are not included in new array
  const currentItemsIds = grids.map(i => i._id).filter(i => !!i);
  const itemsToRemove = await GridModel.model
    .find({ _id: { $nin: currentItemsIds }, question: question._id });

  for (const itemToRemove of itemsToRemove) {
    await itemToRemove.softDelete({ session: question.currentSession });
  }
}

// get clone
Question.schema.methods.getClone =
  async function ({ session, user = {}, ids = {}, draftClone,
    translation, assign, assignItem, replaceTrend, customLanguage, setDraftAsPublish }) {
    try {
      const { QuestionItem, GridRow, GridColumn } = keystone.lists;
      const { companyId: company, currentTeam: team } = user;
      const itemTypes = ['multipleChoice', 'checkboxes', 'dropdown', 'imageChoice'];
      const matrixTypes = ['multipleChoiceMatrix', 'checkboxMatrix'];

      let clone = new Question.model({
        ..._.omit(this.toObject(), ['_id', 'trend', 'general', 'draftData'])
      });

      if (this.pulse) clone.pulseParent = this._id;

      if (draftClone) clone.draftData = this.draftData;

      if (customLanguage) {
        clone = cropTranslation(clone, 'Question', customLanguage);
      }

      if (company) clone.company = company;
      if (team) clone.team = team;

      // assign new clone object with additional data if present
      if (assign && _.isObject(assign)) _.merge(clone, assign);

      clone._req_user = user;

      if (!translation) clone._skipHandleDraftTranslation = true;

      const { _id } = await clone.save({ session });

      ids[this._id] = _id;

      let questionItems = [];
      let gridRows = [];
      let gridColumns = [];

      const query = {
        question: this._id,
        inTrash: { $ne: true },
        ...draftClone ? { draftRemove: { $ne: true } } : { inDraft: { $ne: true } }
      };

      if (itemTypes.includes(clone.type)) {
        questionItems = await QuestionItem.model.find(query);
      }

      if (matrixTypes.includes(clone.type)) {
        [
          gridRows,
          gridColumns
        ] = await Promise.all([
          GridRow.model.find(query),
          GridColumn.model.find(query)
        ]);
      }

      await async.eachLimit([
        ...questionItems,
        ...gridRows,
        ...gridColumns
      ], 5, (item, cb) => {
        const Model = keystone.lists[item.schema.options.collection].model;

        const clone = new Model({
          ..._.omit(item, '_id'),
          question: _id,
          draftRemove: false,
          draftData: draftClone ? { ...item.draftData, question: _id } : {},
          inDraft: draftClone
        });

        if (company) clone.company = company;
        if (team) clone.team = team;

        if (setDraftAsPublish) {
          _.merge(clone, clone.draftData);
          clone.inDraft = false;
        }

        // assign each item if present
        if (assignItem && _.isObject(assignItem)) _.merge(clone, assignItem);

        clone._req_user = user;
        clone.save({ session })
          .then(({ _id }) => {
            ids[item._id] = _id;

            cb();
          })
          .catch(cb);
      });

      // handle flowItems fields (questionItem, gridRow, gridColumn)
      // original replace trend question related ids to clones
      if (replaceTrend && [...itemTypes, ...matrixTypes].includes(clone.type)) {
        const originalIds = Object.keys(ids);
        const { FlowItem } = keystone.lists;

        // load related to original ids flowItems
        const flowItems = await FlowItem.model.find({
          $or: [
            { questionItems: { $in: originalIds } },
            { gridRow: { $in: originalIds } },
            { gridColumn: { $in: originalIds } },
          ]
        });

        await async.eachLimit(flowItems, 5, (item, cb) => {
          if (itemTypes.includes(item.questionType)) {
            item.questionItems = [ids[item.questionItems[0]]];
          }

          if (matrixTypes.includes(item.questionType)) {
            item.gridRow = ids[item.gridRow];
            item.gridColumn = ids[item.gridColumn];
          }

          item.save({ session })
            .then(() => cb())
            .catch(cb);
        });
      }

      // for clone template from survey
      return clone;
    } catch (e) {
      return Promise.reject(e);
    }
  };

// translate
Question.schema.methods.translate = applyTranslateMethod();

// TODO: Add indexes

/**
 * Registration
 */
Question.defaultColumns = 'name.en name.de company team type general trend createdAt';
Question.register();

export default Question;
