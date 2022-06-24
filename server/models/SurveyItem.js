import keystone from 'keystone';
import async from 'async';
import _ from 'lodash';

// helpers
import applySoftDelete from '../helpers/softDelete';
import applySetTrashStage from '../helpers/setTrashStage';
import applyDraftData from '../helpers/applyDraftData';
import handleSortableId from '../helpers/handleSortableId';

// services
import CloudinaryUploader from '../services/CloudinaryUploader';

// config
import { localizeField } from '../../config/localization';
import applyTranslateMethod from '../helpers/applyTranslateMethod';

const Types = keystone.Field.Types;

/**
 * Survey Item Model
 * =================
 */
const SurveyItem = new keystone.List('SurveyItem', {
  track: true
});

SurveyItem.add(
  {
    inDraft: {
      type: Boolean
    },
    draftRemove: {
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
    survey: {
      type: Types.Relationship,
      ref: 'Survey',
      index: true,
      initial: true,
      required: true
    },
    surveySection: {
      type: Types.Relationship,
      ref: 'SurveySection',
      initial: true,
      required: true
    },
    pulseSurveyDriver: {
      type: Types.Relationship,
      ref: 'PulseSurveyDriver'
    },
    type: {
      type: Types.Select,
      options: 'question, trendQuestion, html, contents',
      default: 'question',
      initial: true,
      required: true
    },
    question: {
      type: Types.Relationship,
      ref: 'Question',
      initial: true,
      index: true,
      note: 'For question type'
    },
    notificationMailer: {
      active: {
        type: Boolean,
        default: false,
      },
      mailer: {
        type: Types.Relationship,
        ref: 'Mailer',
        note: 'from question notifications'
      },
      emails: {
        type: Types.TextArray,
        initial: true
      }
    },
    required: { // TODO make hook to handle only for question type + process in survey results ctrl
      type: Boolean,
      initial: true,
      note: 'If question is required'
    },
    customAnswer: {
      type: Boolean
    },
    inTrash: {
      type: Boolean
    },
    hide: {
      type: Boolean,
      default: false
    },
    primaryPulse: {
      type: Boolean
    },
    html: localizeField('surveyItem.html'),
    image: {
      type: Types.CloudinaryImage,
      initial: true,
      autoCleanup: true,
      folder(item) {
        /* istanbul ignore next */
        return `${item.company}/survey-items/${item._id}`;
      },
      note: 'For image type'
    },
    sortableId: {
      type: Number,
      default: 0,
      note: 'For valid items sorting'
    },
    minAnswers: {
      type: Types.Number
    },
    maxAnswers: {
      type: Types.Number
    },
    textLimit: {
      type: Types.Number,
    }
  }
);

SurveyItem.schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    /* istanbul ignore next */
    delete ret._;
    /* istanbul ignore next */
    return ret;
  }
});

SurveyItem.schema.add({ draftData: { type: Object } });

SurveyItem.schema.virtual('flowLogic', {
  ref: 'FlowLogic',
  localField: '_id',
  foreignField: 'surveyItem',
  options: { sort: { sortableId: 1 } }
});

SurveyItem.schema.virtual('displayLogic', {
  ref: 'DisplayLogic',
  localField: '_id',
  foreignField: 'surveyItem',
  options: { sort: { sortableId: 1 } }
});

SurveyItem.schema.virtual('contents', {
  ref: 'ContentItem',
  localField: '_id',
  foreignField: 'surveyItem',
  options: {
    sort: { sortableId: 1 },
    match: {
      inTrash: { $ne: true },
      draftRemove: { $ne: true }
    }
  }
});

SurveyItem.schema.virtual('surveyReportItem', {
  ref: 'SurveyReportItem',
  localField: '_id',
  foreignField: 'surveyItem',
  justOne: true
});

// handle sortableId
SurveyItem.schema.pre('save', async function (next) {
  try {
    await handleSortableId(this, SurveyItem);

    next();
  } catch (e) {
    return next(e);
  }
});

// TODO
// Required validations
// SurveyItem.schema.path('question').required(function () {
//   return this.type === 'question';
// }, 'Path `question` is required.');

// Clear image from cloudinary
SurveyItem.schema.pre('remove', async function (next) {
  try {
    // clear logo
    if (this.image && this.image.public_id) {
      await CloudinaryUploader.cleanUp({ public_id: this.image.public_id });
    }
    next();
  } catch (e) {
    /* istanbul ignore next */
    next(e);
  }
});

SurveyItem.schema.methods.softDelete = applySoftDelete('surveyItem');

SurveyItem.schema.methods.setTrashStage = applySetTrashStage('surveyItem');

// get clone
SurveyItem.schema.methods.getClone = async function(options = {}) {
  try {
    const { session, user, ids = {}, draftClone, cloneSection, customLanguage } = options;
    const { Question, ContentItem, FlowLogic, FlowItem, DisplayLogic } = keystone.lists;
    const { companyId: company, currentTeam: team } = user;
    const { sortableId, question, survey, surveySection, type, pulseSurveyDriver } = this;

    const clone = new SurveyItem.model({
      ..._.omit(this.toObject(), ['_id', 'draftRemove', 'question', 'survey']),
      company,
      team,
      survey: draftClone ? survey : ids[survey],
      surveySection: draftClone ? surveySection : ids[surveySection],
      inDraft: draftClone,
      draftData: draftClone ? { ...this.draftData, sortableId } : {},
      sortableId: draftClone ? 0 : sortableId,
      pulseSurveyDriver: draftClone ? pulseSurveyDriver : ids[this.pulseSurveyDriver]
    });

    if (type === 'trendQuestion') {
      clone.question = question;
      // ids = {  sourceSurveyEntityId: cloneSurveyEntityId } structured
      ids[question] = question;
    }

    if (type === 'question') {
      const questionDoc = await Question.model.findOne({
        _id: question,
        inTrash: { $ne: true },
        trend: { $ne: true },
        general: { $ne: true }
      });

      if (questionDoc) {
        const clonedQuestion = await questionDoc.getClone({
          session,
          user,
          ids,
          draftClone,
          customLanguage
        });

        clone.question = clonedQuestion._id;
      }
    }

    clone._req_user = user;

    //  for survey-clone-item in draft
    if (draftClone) {
      clone._cloneDraftSurveyItem = true;
      clone._skipHandleSortableId = this._skipHandleSortableId;
    }

    const { _id } = await clone.save({ session });

    // ids = {  sourceSurveyEntityId: cloneSurveyEntityId } structured
    ids[this._id] = _id;

    if (type === 'contents' && draftClone) {
      const contentItems = await ContentItem.model.find({
        survey,
        surveyItem: this._id,
        inTrash: { $ne: true },
        draftRemove: { $ne: true },
        type: 'content'
      });

      await async.eachLimit(contentItems, 5, (item, cb) => {
        if (cloneSection) item.surveyItem = clone._id;

        item.getClone({ session, user, ids, draftClone })
          .then(() => cb())
          .catch(cb);
      });
    }

    const [
      flowLogic,
      displayLogic
    ] = await Promise.all([
      FlowLogic.model
        .find({
          surveyItem: this._id,
          ...draftClone ? { draftRemove: { $ne: true } } : { inDraft: { $ne: true } }
        })
        .lean(),
      DisplayLogic.model
        .find({
          surveyItem: this._id,
          ...draftClone ? { draftRemove: { $ne: true } } : { inDraft: { $ne: true } }
        })
        .lean()
    ]);

    await async.eachLimit(flowLogic, 5, (logic, cb) => {
      const cloneFlow = new FlowLogic.model({
        ..._.omit(logic, '_id'),
        team,
        company,
        draftRemove: false,
        surveyItem: ids[this._id],
        section: draftClone ? logic.section : ids[logic.section],
        draftData: draftClone ? logic.draftData : {},
        inDraft: draftClone
      });

      if (cloneSection) cloneFlow.section = clone.surveySection;

      cloneFlow._req_user = user;
      cloneFlow.save({ session })
        .then(({ _id }) => {
          ids[logic._id] = _id;

          cb();
        })
        .catch(cb);
    });

    if (draftClone) {
      await async.eachLimit(displayLogic, 5, (logic, cb) => {
        const cloneDisplay = new DisplayLogic.model({
          ..._.omit(logic, '_id'),
          team,
          company,
          draftRemove: false,
          surveyItem: ids[this._id],
          section: draftClone ? logic.section : ids[logic.section],
          draftData: draftClone ? logic.draftData : {},
          inDraft: draftClone
        });

        cloneDisplay._req_user = user;
        cloneDisplay.save({ session })
          .then(({ _id }) => {
            ids[logic._id] = _id;

            cb();
          })
          .catch(cb);
      });
    }

    // clone flowItems
    if (draftClone && (flowLogic.length || displayLogic.length)) {
      const flowItems = await FlowItem.model.find({
        $or: [
          { flowLogic: { $in: flowLogic.map(i => i._id) } },
          { displayLogic: { $in: displayLogic.map(i => i._id) } }
        ],
        draftRemove: { $ne: true }
      });

      await async.eachLimit(flowItems, 5, (flowItem, cb) => {
        const { questionItems = [] } = flowItem;

        const cloneItem = new FlowItem.model({
          ..._.omit(flowItem, '_id'),
          company,
          team,
          survey
        });

        ['gridRow', 'gridColumn', 'flowLogic', 'displayLogic', 'endPage'].forEach((key) => {
          if (ids[flowItem[key]]) cloneItem[key] = ids[flowItem[key]];
        });

        cloneItem.questionItems = questionItems.map(i => ids[i] || i);
        cloneItem._req_user = user;
        cloneItem.save({ session })
          .then(() => cb())
          .catch(cb);
      });
    }

    if (draftClone) return _id;

    //  for clone template from survey
    return clone;
  } catch (e) {
    return Promise.reject(e);
  }
};

// apply draft
SurveyItem.schema.methods.applyDraft = async function(options = {}) {
  try {
    const { Question, QuestionItem, GridRow, GridColumn, FlowLogic, DisplayLogic } = keystone.lists;
    const { _id: surveyItem, question: _id, type } = this;

    let question;

    if (type === 'question') {
      const itemTypes = ['multipleChoice', 'checkboxes', 'dropdown', 'thumbs', 'imageChoice'];
      const matrixTypes = ['multipleChoiceMatrix', 'checkboxMatrix'];

      let questionItems = [];
      let gridRows = [];
      let gridColumns = [];

      question = await Question.model.findOne({
        _id,
        trend: { $ne: true },
        general: { $ne: true }
      });

      const query = {
        question: question._id,
        inTrash: { $ne: true },
        draftRemove: { $ne: true }
      };

      if (question && itemTypes.includes(question.type)) {
        [questionItems] = await Promise.all([
          QuestionItem.model.find(query),
          // remove
          QuestionItem.model.updateMany(
            { question: question._id, draftRemove: true },
            { inTrash: true },
            options
          ),
        ]);
      }

      if (question && matrixTypes.includes(question.type)) {
        [
          gridRows,
          gridColumns
        ] = await Promise.all([
          GridRow.model.find(query),
          GridColumn.model.find(query),
          // remove
          GridRow.model.updateMany(
            { question: question._id, draftRemove: true },
            { inTrash: true },
            options
          ),
          GridColumn.model.updateMany(
            { question: question._id, draftRemove: true },
            { inTrash: true },
            options
          )
        ]);
      }

      await async.eachLimit([...questionItems, ...gridRows, ...gridColumns], 5, (item, cb) => {
        applyDraftData(item);

        item.markModified('draftData');
        item.save(options)
          .then(() => cb())
          .catch(cb);
      });

      applyDraftData(question);

      question.markModified('draftData');
      question.markModified('scoreObj');

      await question.save(options);
    }

    const [
      flowLogic,
      displayLogic
    ] = await Promise.all([
      FlowLogic.model.find({ surveyItem, draftRemove: { $ne: true } }),
      DisplayLogic.model.find({ surveyItem, draftRemove: { $ne: true } }),
      // remove
      FlowLogic.model.deleteMany({ surveyItem, draftRemove: true }, options),
      DisplayLogic.model.deleteMany({ surveyItem, draftRemove: true }, options)
    ]);

    await async.eachLimit([...flowLogic, ...displayLogic], 5, (item, cb) => {
      applyDraftData(item);

      item.markModified('draftData');
      item.save(options)
        .then(() => cb())
        .catch(cb);
    });

    applyDraftData(this);

    this.markModified('draftData');

    await this.save(options);
  } catch (e) {
    return Promise.reject(e);
  }
};

// close draft
SurveyItem.schema.methods.closeDraft = async function(options) {
  try {
    if (this.inDraft) return await this.softDelete(options);

    const { Question, QuestionItem, GridRow, GridColumn, FlowLogic, DisplayLogic } = keystone.lists;
    const { _id: surveyItem, question: _id, type } = this;

    if (type === 'question') {
      const itemTypes = ['multipleChoice', 'checkboxes', 'dropdown'];
      const matrixTypes = ['multipleChoiceMatrix', 'checkboxMatrix'];

      const question = await Question.model.findOne({
        _id,
        type: { $in: [...itemTypes, ...matrixTypes] },
        general: { $ne: true },
        trend: { $ne: true }
      });

      if (question) {
        if (itemTypes.includes(question.type)) {
          await Promise.all([
            QuestionItem.model.deleteMany({ question, inDraft: true }, options),
            QuestionItem.model.updateMany(
              { question, inDraft: false },
              { draftRemove: false, draftData: {} },
              options
            )
          ]);
        }

        if (matrixTypes.includes(question.type)) {
          await Promise.all([
            GridRow.model.deleteMany({ question, inDraft: true }, options),
            GridColumn.model.deleteMany({ question, inDraft: true }, options),
            GridRow.model.updateMany(
              { question, inDraft: false },
              { draftRemove: false, draftData: {} },
              options
            ),
            GridColumn.model.updateMany(
              { question, inDraft: false },
              { draftRemove: false, draftData: {} },
              options
            )
          ]);
        }

        question.draftData = {};
        question.markModified('draftData');

        await question.save(options);
      }
    }

    await Promise.all([
      FlowLogic.model.deleteMany({ surveyItem, inDraft: true }, options),
      DisplayLogic.model.deleteMany({ surveyItem, inDraft: true }, options),
      FlowLogic.model.updateMany(
        { surveyItem, inDraft: false },
        { draftRemove: false, draftData: {} },
        options
      ),
      DisplayLogic.model.updateMany(
        { surveyItem, inDraft: false },
        { draftRemove: false, draftData: {} },
        options
      ),
    ]);

    this.draftRemove = false;
    this.draftData = {};
    this.markModified('draftData');

    await this.save(options);
  } catch (e) {
    return Promise.reject(e);
  }
};

// translate
SurveyItem.schema.methods.translate = applyTranslateMethod();

// TODO: Add indexes
// TODO: validations for different types
// TODO: Remove question before delete
/**
 * Registration
 */
SurveyItem.defaultColumns = 'name company team survey type createdAt';
SurveyItem.register();

export default SurveyItem;
