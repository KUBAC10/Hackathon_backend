import _ from 'lodash';
import async from 'async';
import keystone from 'keystone';
import mongoose from 'mongoose';

// helpers
import {
  abortTransaction,
  commitTransaction,
  initSessionWithTransaction
} from '../helpers/transactions';
import applySoftDelete from '../helpers/softDelete';
import applyTranslateMethod from '../helpers/applyTranslateMethod';
import applyDraftData from '../helpers/applyDraftData';
import parseTpl from '../helpers/parse-es6-template';
import handleDraftTranslation from '../helpers/handleDraftTranslation';
import { checkLimit, handleLimit } from '../helpers/limitation';
import cropTranslation from '../helpers/cropTranslation';

// services
import APIMessagesExtractor from '../services/APIMessagesExtractor';
import CloudinaryUploader from '../services/CloudinaryUploader';

// config
import { localizationList, localizeField } from '../../config/localization';

const ValidationError = mongoose.Error.ValidationError;
const ValidatorError = mongoose.Error.ValidatorError;

const Types = keystone.Field.Types;

/**
 * Survey Model
 * ============
 */
const Survey = new keystone.List('Survey', {
  track: true
});

Survey.add(
  {
    inDraft: {
      type: Boolean,
      default: false
    },
    // main config
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
    type: {
      type: Types.Select,
      options: 'survey, template',
      initial: true,
      required: true,
      default: 'survey'
    },
    surveyType: {
      type: Types.Select,
      options: 'survey, quiz, poll, pulse',
      initial: true,
      required: true,
      default: 'survey'
    },
    defaultLanguage: {
      type: Types.Select,
      options: localizationList,
      initial: true,
      required: true,
      default: 'en'
    },
    displaySingleQuestion: {
      type: Boolean,
      initial: false,
      default: false
    },
    timer: {
      active: {
        type: Boolean,
        initial: false,
        default: false
      },
      limit: {
        type: Types.Number
      },
      pause: {
        type: Boolean,
        initial: false,
        default: false
      }
    },
    approximateTime: {
      type: Number
    },
    primaryPulse: {
      type: Boolean
    },
    pulseDistribute: {
      type: Types.Relationship,
      ref: 'SurveyCampaign'
    },
    liveData: {
      type: Boolean,
      default: true
    },
    publicPreview: {
      type: Boolean
    },
    distributeByTargets: {
      type: Boolean,
      default: false
    },
    cookiesCheck: {
      type: Boolean,
      default: false
    },
    scoreCondition: {
      type: Types.Select,
      options: 'correctAmount, totalScore',
    },
    scoring: {
      type: Boolean
    },
    overallScore: {
      type: Number
    },
    // quiz
    showResultText: {
      type: Types.Select,
      options: ['showResult', 'option', 'question', 'none'],
      initial: true,
      required: true,
      default: 'none'
    },
    answersList: {
      type: Boolean
    },
    scorePercentage: {
      type: Boolean
    },

    // access config
    active: {
      type: Boolean,
      initial: false,
      default: true
    },
    publicAccess: {
      type: Boolean,
      initial: false,
      default: false
    },
    publicTTL: {
      type: Number,
      note: 'Time to live for public results'
    },
    publicTTLView: {
      type: Types.Select,
      options:
        [
          { name: 'minutes', value: '60000' },
          { name: 'hours', value: '3600000' },
          { name: 'days', value: '86400000' },
          { name: 'weeks', value: '604800000' }
        ]
    },
    urlName: {
      type: String,
      lowercase: true,
      watch: 'urlName',
      require() {
        return this.publicAccess;
      },
      default() {
        return this._id.toString();
      },
      value() {
        /* istanbul ignore next */
        return this.urlName ? _.deburr(_.kebabCase(this.urlName)) : undefined;
      }
    },
    startDate: {
      type: Types.Date,
      utc: true
    },
    endDate: {
      type: Types.Date,
      utc: true
    },
    customAnimation: {
      type: Boolean,
      default: false
    },

    // customization
    allowReAnswer: {
      type: Boolean,
      initial: false,
      default: false
    },
    // TODO remove
    logo: {
      type: Types.CloudinaryImage,
      autoCleanup: true,
      initial: true,
      folder(item) {
        /* istanbul ignore next */
        return `${item.company}/logo/${item._id}`;
      },
    },
    previewScreenShot: {
      type: Types.CloudinaryImage,
      autoCleanup: true,
      initial: true,
      folder(item) {
        /* istanbul ignore next */
        return `${item.company}/survey-preview/${item._id}`;
      }
    },
    updatePreviewScreenShot: {
      type: Boolean
    },
    // TODO move to model???
    footer: {
      text: localizeField('survey.text'),
      content: localizeField('surveyItem.html'),
      align: {
        type: Types.Select,
        options: 'left, right, center, none',
        default: 'none',
      },
      html: {
        type: Boolean,
        default: false
      },
      active: {
        type: Boolean,
        default: false
      }
    },
    references: {
      active: {
        type: Boolean,
        default: false
      },
      content: localizeField('surveyItem.html'),
    },

    // counters
    totalCompleted: {
      type: Types.Number,
      initial: false,
      default: 0
    },
    totalResults: {
      type: Types.Number,
      initial: false,
      default: 0
    },
    lastAnswerDate: {
      type: Types.Date,
      initial: false
    },
    questionsCount: {
      type: Number,
      default: 0
    },

    // remove
    inTrash: {
      type: Boolean,
      initial: false,
      default: false
    },

    // TODO move to another model?
    // template helpers
    originalSurvey: {
      type: Types.Relationship,
      ref: 'Survey'
    },
    scope: {
      companies: {
        type: Types.Relationship,
        ref: 'Company',
        many: true
      },
      global: {
        type: Boolean
      }
    },
    isGlobalTemplate: {
      type: Boolean,
      default: false
    }
  }, 'Localization', {
    name: localizeField('general.name'),
    description: localizeField('general.description'),
    translation: localizeField('general.translation')
  }
);

Survey.schema.add({ draftData: { type: Object } });

// TODO: Add indexes
Survey.relationship({ path: 'surveySections', ref: 'SurveySection', refPath: 'survey' });
Survey.relationship({ path: 'surveyItems', ref: 'SurveyItem', refPath: 'survey' });
Survey.relationship({ path: 'tagEntities', ref: 'TagEntity', refPath: 'survey' });

// virtual relations
Survey.schema.virtual('tagEntities', {
  ref: 'TagEntity',
  localField: '_id',
  foreignField: 'survey'
});

Survey.schema.virtual('surveySections', {
  ref: 'SurveySection',
  localField: '_id',
  foreignField: 'survey',
  options: {
    sort: { sortableId: 1 },
    match: { inDraft: { $ne: true } }
  }
});

Survey.schema.virtual('pulseSurveyDrivers', {
  ref: 'PulseSurveyDriver',
  localField: '_id',
  foreignField: 'survey',
  options: {
    match: { inDraft: { $ne: true } }
  }
});

Survey.schema.virtual('surveySection', {
  ref: 'SurveySection',
  localField: '_id',
  justOne: true,
  foreignField: 'survey',
  options: { match: { inDraft: { $ne: true } } }
});

Survey.schema.virtual('surveyItems', {
  ref: 'SurveyItem',
  localField: '_id',
  foreignField: 'survey',
  options: {
    sort: { sortableId: 1 },
    match: { inTrash: { $ne: true }, inDraft: { $ne: true } }
  }
});

Survey.schema.virtual('totalInvites', {
  ref: 'Invite',
  localField: '_id',
  foreignField: 'survey',
  count: true
});

Survey.schema.virtual('trash', {
  ref: 'Trash',
  localField: '_id',
  justOne: true,
  foreignField: 'survey'
});

Survey.schema.virtual('surveyTheme', {
  ref: 'SurveyTheme',
  localField: '_id',
  justOne: true,
  foreignField: 'survey',
  match: { type: 'survey' }
});

Survey.schema.virtual('startPage', {
  ref: 'ContentItem',
  localField: '_id',
  foreignField: 'survey',
  justOne: true,
  options: {
    match: {
      inTrash: { $ne: true },
      inDraft: { $ne: true },
      type: 'startPage',
      default: true
    }
  }
});

Survey.schema.virtual('startPages', {
  ref: 'ContentItem',
  localField: '_id',
  foreignField: 'survey',
  options: {
    match: {
      type: 'startPage',
      inTrash: { $ne: true },
      draftRemove: { $ne: true },
    }
  }
});

Survey.schema.virtual('endPages', {
  ref: 'ContentItem',
  localField: '_id',
  foreignField: 'survey',
  options: {
    match: {
      type: 'endPage',
      inTrash: { $ne: true },
      draftRemove: { $ne: true },
    }
  }
});

Survey.schema.virtual('surveyReport', {
  ref: 'SurveyReport',
  localField: '_id',
  foreignField: 'survey',
  justOne: true,
  options: {
    match: { default: true }
  }
});

Survey.schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    /* istanbul ignore next */
    delete ret._;
    /* istanbul ignore next */
    return ret;
  }
});

Survey.schema.post('init', function () {
  const _thisObj = this.toObject();
  this._oldLogo = _thisObj.logo;
});

/**
 * Save
 * ===================
 */

// start save session
Survey.schema.pre('save', async function (next) {
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
Survey.schema.pre('save', async function (next) {
  try {
    if (this.isNew) await checkLimit(this);
  } catch (e) {
    return next(e);
  }
});

// create default survey report
Survey.schema.pre('save', async function (next) {
  try {
    if (!this.isNew) return next();

    const { SurveyReport } = keystone.lists;

    const surveyReport = new SurveyReport.model({
      default: true,
      survey: this._id,
      company: this.company,
      team: this.team,
      name: 'Default Survey Report'
    });

    await surveyReport.save();
  } catch (e) {
    return next(e);
  }
});

// handle isGlobalTemplate flag
Survey.schema.pre('save', async function (next) {
  try {
    if (this.isModified('scope.companies') || this.isModified('scope.global')) {
      this.isGlobalTemplate = !!this.scope.companies.length || this.scope.global;
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// create survey theme for new survey
Survey.schema.pre('save', async function (next) {
  try {
    if (this._withTheme && this.isNew) {
      const { SurveyTheme } = keystone.lists;

      const theme = new SurveyTheme.model({
        type: 'survey',
        survey: this._id,
        company: this.company,
        team: this.team
      });

      if (this.customAnimation) {
        theme.sectionStyle = 'dark';
        theme.questionStyle = 'dark';
        theme.questionNumbers = true;
        theme.progressBar = true;
      }

      theme._req_user = this._req_user;

      if (typeof this._withTheme === 'object') Object.assign(theme, this._withTheme);

      await theme.save();
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// TODO test
// crete default survey campaign for pulse survey
Survey.schema.pre('save', async function (next) {
  try {
    if (this.isNew && this.surveyType === 'pulse' && !this.primaryPulse) {
      const { _id: survey, team, company } = this;
      const { SurveyCampaign } = keystone.lists;

      const surveyCampaign = new SurveyCampaign.model({
        team,
        company,
        survey,
        pulse: true
      });

      await surveyCampaign.save();

      this.pulseDistribute = surveyCampaign._id;
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// handle animated view in draft
Survey.schema.pre('save', async function (next) {
  try {
    if (this.isNew || !this.draftData) return next();
    if (this.draftData.customAnimation && this.isModified('draftData.customAnimation')) {
      const { SurveyTheme } = keystone.lists;

      this.draftData.displaySingleQuestion = true;
      this.draftData.responseEditing = this.surveyType === 'survey';

      // update survey theme
      await SurveyTheme.model.updateOne({
        survey: this._id,
        type: 'survey'
      }, { $set: {
        'draftData.questionNumbers': true,
        // 'draftData.progressBar': true
      } });
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// disable survey re-answer for quiz's and poll's
Survey.schema.pre('save', function (next) {
  if (this.isModified('surveyType') && ['quiz, poll'].includes(this.surveyType)) {
    this.allowReAnswer = false;
  }
  next();
});

// handle public/private logic
Survey.schema.pre('save', async function (next) {
  if (this.isModified('publicAccess')) {
    // remove urlName for private surveys
    if (!this.publicAccess) {
      this.urlName = undefined;
      this.publicTTL = undefined;
      this.publicTTLView = undefined;
    }
    // validate presence of urlName for public survey
    if (this.publicAccess && !this.urlName) {
      try {
        const error = new ValidationError(this);
        // get error text
        const message = await APIMessagesExtractor.getError(this._lang, 'global.isRequired');
        error.errors.urlName = new ValidatorError({ message });
        return next(error);
      } catch (e) {
        return next(e);
      }
    }
  }
  next();
});

// handle draft translation
Survey.schema.pre('save', async function (next) {
  try {
    if (!this.isNew && !this._skipHandleDraftTranslation) handleDraftTranslation(this);
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// clear draft references and footer text/html
Survey.schema.pre('save', function (next) {
  if (!_.isEmpty(this.draftData) && !this.isNew) {
    // if footer is turned off
    if (this.isModified('draftData.footer.active') && _.get(this, 'draftData.footer.active') === false) {
      // clear text changed fields
      _.unset(this, 'draftData.footer.textChanged');
      _.unset(this, 'draftData.footer.contentChanged');
      // clear text and content data
      _.set(this, 'draftData.footer.content', {});
      _.set(this, 'draftData.footer.text', {});

      this.markModified('draftData.footer');
    }

    // handle switch footer html/text
    if (this.isModified('draftData.footer.html')) {
      const footerIsHtml = _.get(this, 'draftData.footer.html');
      if (footerIsHtml) {
        // if footer became html, reset text data
        // clear text changed fields
        _.unset(this, 'draftData.footer.textChanged');
        _.set(this, 'draftData.footer.text', {});
      } else {
        _.unset(this, 'draftData.footer.contentChanged');
        _.set(this, 'draftData.footer.content', {});
      }

      this.markModified('draftData.footer');
    }

    // if references is turned off
    if (this.isModified('draftData.references.active') && _.get(this, 'draftData.references.active') === false) {
      // clear text changed fields
      _.unset(this, 'draftData.references.contentChanged');
      // clear text and content data
      _.set(this, 'draftData.references.content', {});

      this.markModified('draftData.references');
    }
  }

  next();
});

// commit save session
Survey.schema.pre('save', async function (next) {
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

// TODO: make plugin
// catch error
Survey.schema.post('save', async function (err, doc, next) {
  try {
    if (err.name === 'MongoError' && err.code === 11000) {
      // list of keys which have unique scope
      const uniqueKeys = ['urlName'];
      // get first key
      const field = _.find(uniqueKeys, k => err.errmsg.includes(k));
      const error = new ValidationError(this);
      let message = await APIMessagesExtractor.getError(this._lang, 'global.uniqueField');
      message = parseTpl(message, { field }, '');
      error.errors[field] = new ValidatorError({ message });
      return next(error);
    }
  } catch (e) {
    return next(e);
  }
});

// handle company limit
Survey.schema.post('save', async function (next) {
  try {
    if (this._limit) await handleLimit(this._limit);
  } catch (e) {
    return next(e);
  }
});

/**
 * Remove
 * ===================
 */

// Clear related entities
Survey.schema.pre('remove', async function (next) {
  try {
    const { SurveyTheme, SurveyReport } = keystone.lists;
    const { _id: survey } = this;

    await Promise.all([
      SurveyTheme.model.remove({ survey }),
      SurveyReport.model.remove({ survey })
    ]);

    next();
  } catch (e) {
    /* istanbul ignore next */
    next(e);
  }
});

// Clear Cloudinary Images
Survey.schema.pre('remove', async function (next) {
  try {
    // clear logo image
    if (_.get(this, 'logo.public_id')) {
      await CloudinaryUploader.cleanUp({ public_id: this.logo.public_id });
    }

    next();
  } catch (e) {
    /* istanbul ignore next */
    next(e);
  }
});

/**
 * Static
 * ===================
 */

Survey.schema.statics.getStatusBarData = async function ({ survey, surveyResult, flowLogics }) {
  try {
    const { surveySections, displaySingleQuestion } = survey;
    const { step, questionStepHistory } = surveyResult;

    const result = surveySections.reduce((acc, section) => {
      const questions = section.surveyItems
        .filter(item => ['question', 'trendQuestion'].includes(item.type))
        .map(item => item._id.toString());

      if (displaySingleQuestion) {
        const last = _.last(questionStepHistory);
        const intersection = _.intersection(questions, questionStepHistory);

        if (section.step === step) {
          acc.passedSection = intersection
            .filter(i => i !== last)
            .length;

          acc.passed += acc.passedSection;
        }

        if (section.step !== step) acc.passed += intersection.length;
      }

      if (section.step < step && !displaySingleQuestion) acc.passed += questions.length;

      if (section.step === step) acc.totalSection = questions.length;

      acc.total += questions.length;

      return acc;
    }, {
      passed: 0,
      passedSection: 0,
      total: 0,
      totalSection: 0
    });

    // if flowLogics present - send flag to not show total progress
    if (flowLogics && flowLogics.length) result.hideTotalProgress = true;

    return result;
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Methods
 * ===================
 */

// soft delete
Survey.schema.methods.softDelete = applySoftDelete('survey');

// TODO tests
// load survey items with quiz results of answer
Survey.schema.methods.processQuizResult = async function (answer, surveyItems) {
  try {
    const answerKeys = Object.keys(answer);

    // return questions with correct quiz answers
    const quizResult = surveyItems.filter(item => answerKeys.includes(item._id.toString()));

    // count correct quiz answers
    const quizCorrect = _countQuizCorrectAnswers(quizResult, answer);

    return { quizResult, quizCorrect };
  } catch (e) {
    return Promise.reject(e);
  }
};

// TODO tests
// TODO rewrite to aggregate
// count total quiz questions in survey
Survey.schema.methods.countQuizQuestions = async function () {
  try {
    const SurveyItem = keystone.lists.SurveyItem;

    const surveyItems = await SurveyItem
      .model
      .find({
        survey: this._id,
        inTrash: { $ne: true }
      }, 'question') // return only answered results
      .populate({
        path: 'question',
        match: { quiz: { $eq: true } }, // load only quiz questions
      })
      .lean();

    return surveyItems.filter(i => i.question).length;
  } catch (e) {
    return Promise.reject(e);
  }
};

// TODO test
// count points by survey answer
Survey.schema.methods.countScorePoints = function (answer, surveySections) {
  const surveyItems = surveySections
    .reduce((acc, { surveyItems = [] }) => ([...acc, ...surveyItems]), []);

  return Object
    .keys(answer)
    .reduce((acc, surveyItemId) => {
      const surveyItem = surveyItems.find(item => item._id.toString() === surveyItemId);
      const questionType = _.get(surveyItem, 'question.type');

      if (!surveyItem) return acc;

      if (['imageChoice', 'dropdown', 'checkboxes', 'multipleChoice'].includes(questionType)) {
        const questionItems = _.get(surveyItem, 'question.questionItems', [])
          .filter(item => _.get(answer, `${surveyItemId}.questionItems`, []).includes(item._id.toString()));

        questionItems.forEach((item) => {
          acc += item.score;
        });
      }

      if (['linearScale', 'thumbs'].includes(questionType)) {
        const scoreObj = _.get(surveyItem, 'question.scoreObj', {});

        let key = _.get(answer, `${surveyItemId}.value`);

        if (questionType === 'linearScale') key = `value${key}`;

        acc += scoreObj[key] || 0;
      }

      return acc;
    }, 0);
};

// clone survey
Survey.schema.methods.getClone = async function ({ session, user, type = 'template', customLanguage }) {
  try {
    const {
      SurveySection,
      SurveyItem,
      ContentItem,
      DisplayLogic,
      FlowItem,
      SurveyTheme,
      PulseSurveyDriver
    } = keystone.lists;

    const { companyId: company, currentTeam: team } = user;
    const ids = {}; // { [original._id]: clone._id }
    const select = [
      'surveyType',
      'defaultLanguage',
      'displaySingleQuestion',
      'timer',
      'showResultText',
      'answersList',
      'scorePercentage',
      'publicAccess',
      'publicTTL',
      'publicTTLView',
      'allowReAnswer',
      'footer',
      'references',
      'name',
      'description',
      'approximateTime',
      'questionsCount',
      'customAnimation'
    ];

    // add translation if custom Language not present
    if (!customLanguage) {
      select.push('translation');
    }

    let clone = new Survey.model({
      ..._.pick(this.toObject(), select),
      company,
      team,
      type,
      originalSurvey: this._id,
      defaultLanguage: customLanguage || this.defaultLanguage
    });

    // change language if user present custom language
    if (customLanguage) {
      clone = cropTranslation(clone, 'Survey', customLanguage);
      clone.translation[customLanguage] = true;
    }

    clone._req_user = user;

    await _setCounters(this._id, clone);

    const { _id: survey } = await clone.save({ session });

    ids[this._id] = survey;

    const [
      surveySections,
      surveyItems,
      contentItems,
      displayLogic,
      flowItems,
      surveyTheme
    ] = await Promise.all([
      SurveySection.model
        .find({ survey: this._id, inDraft: { $ne: true } })
        .select('-inDraft -draftRemove -company -team -survey -draftData')
        .lean(),
      SurveyItem.model
        .find({ survey: this._id, inTrash: { $ne: true }, inDraft: { $ne: true } })
        .select('-draftData'),
      ContentItem.model
        .find({ survey: this._id, inTrash: { $ne: true }, inDraft: { $ne: true } })
        .select('-draftData'),
      DisplayLogic.model
        .find({ survey: this._id, inTrash: { $ne: true }, inDraft: { $ne: true } })
        .select('-draftData'),
      FlowItem.model
        .find({ survey: this._id, inDraft: { $ne: true } })
        .select('-inDraft -draftRemove -company -team -survey -draftData')
        .lean(),
      SurveyTheme.model.findOne({ survey: this._id })
    ]);

    // clone pulse survey drivers
    if (this.surveyType === 'pulse') {
      const drivers = await PulseSurveyDriver.model
        .find({ survey: this._id, inDraft: { $ne: true } })
        .select('-inDraft -draftRemove -company -team -survey -draftData')
        .lean();

      await async.eachLimit(drivers, 5, (driver, cb) => {
        const cloneDriver = new PulseSurveyDriver.model({
          ..._.omit(driver, '_id'),
          company,
          team,
          survey
        });

        cloneDriver.primaryPulse = this.primaryPulse;
        cloneDriver._req_user = user;
        cloneDriver.save({ session })
          .then(({ _id }) => {
            ids[driver._id] = _id;

            cb();
          })
          .catch(cb);
      });
    }

    // clone survey sections
    await async.eachLimit(surveySections, 5, (section, cb) => {
      let cloneSection = new SurveySection.model({
        ..._.omit(section, '_id'),
        company,
        team,
        survey,
        pulseParent: section._id
      });

      if (this.surveyType === 'pulse') {
        cloneSection.pulseSurveyDriver = ids[section.pulseSurveyDriver];
      }

      if (customLanguage) {
        // crop translate for default sub drivers
        cloneSection = cropTranslation(cloneSection, 'SurveySection', customLanguage);
      }

      cloneSection.primaryPulse = this.primaryPulse;
      cloneSection._req_user = user;
      cloneSection.save({ session })
        .then(({ _id }) => {
          ids[section._id] = _id;

          cb();
        })
        .catch(cb);
    });

    // clone surveyItems => question/items => flowLogic
    await async.eachLimit(surveyItems, 5, (surveyItem, cb) => {
      surveyItem.primaryPulse = this.primaryPulse;
      surveyItem.getClone({ session, user, ids, customLanguage })
        .then(() => cb())
        .catch(cb);
    });

    // clone contentItems (content, start/end page) and survey theme
    await async.eachLimit(contentItems, 5, (contentItem, cb) => {
      contentItem.getClone({ session, user, ids })
        .then(() => cb())
        .catch(cb);
    });

    // clone displayLogic
    await async.eachLimit(displayLogic, 5, (logic, cb) => {
      const cloneDisplay = new DisplayLogic.model({
        ..._.omit(logic, '_id'),
        team,
        company,
        draftRemove: false,
        survey: ids[this._id],
        surveyItem: ids[logic.surveyItem],
        conditionSurveyItem: ids[logic.conditionSurveyItem]
      });

      cloneDisplay._req_user = user;
      cloneDisplay.save({ session })
        .then(({ _id }) => {
          ids[logic._id] = _id;

          cb();
        })
        .catch(cb);
    });

    // clone flowItems
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

    // clone survey theme
    if (surveyTheme) await surveyTheme.getClone({ session, user, survey });

    return survey;
  } catch (e) {
    return Promise.reject(e);
  }
};

// apply draft
Survey.schema.methods.applyDraft = async function (options = {}) {
  try {
    const {
      SurveySection,
      SurveyItem,
      SurveyTheme,
      ContentItem,
      Trash,
      FlowItem,
      PulseSurveyDriver
    } = keystone.lists;

    const { _id: survey } = this;

    // merge and clear data
    const [
      sections,
      pulseSurveyDrivers,
      flowItems,
      surveyItems,
      contentItems,
      surveyThemes
    ] = await Promise.all([
      SurveySection.model.find({ survey, draftRemove: { $ne: true } }),
      PulseSurveyDriver.model.find({ survey, draftRemove: { $ne: true } }),
      FlowItem.model.find({ survey, draftRemove: { $ne: true } }),
      SurveyItem.model.find({ survey, inTrash: { $ne: true }, draftRemove: { $ne: true } }),
      ContentItem.model.find({ survey, inTrash: { $ne: true }, draftRemove: { $ne: true } }),
      SurveyTheme.model.find({ survey }),

      // remove sections and flow items
      SurveySection.model.deleteMany({ survey, draftRemove: true }, options),
      PulseSurveyDriver.model.deleteMany({ survey, draftRemove: true }, options),
      FlowItem.model.deleteMany({ survey, draftRemove: true }, options),

      // set stage and inTrash statuses
      Trash.model.updateMany({
        draft: survey,
        stage: 'inDraft'
      }, { $set: { stage: 'initial' } }, options),

      // update inTrash status for draftRemove entities
      ContentItem.model.updateMany(
        { survey, inTrash: { $ne: true }, draftRemove: true },
        { inTrash: true },
        options
      ),
      SurveyItem.model.updateMany(
        { survey, inTrash: { $ne: true }, draftRemove: true },
        { inTrash: true },
        options
      )
    ]);

    let step = 0;
    // sort section before set correct step
    const sortedSections = sections
      .map((section) => {
        applyDraftData(section);

        return section;
      })
      .sort((a, b) => a.sortableId - b.sortableId);

    // apply sections
    await async.eachLimit(sortedSections, 5, (section, cb) => {
      if (!section.hide) {
        section.step = step;

        step += 1;
      }

      section.markModified('draftData');
      section.save(options)
        .then(() => cb())
        .catch(cb);
    });

    // apply pulse survey drivers
    await async.eachLimit(pulseSurveyDrivers, 5, (driver, cb) => {
      applyDraftData(driver);

      driver.markModified('draftData');
      driver.save(options)
        .then(() => cb())
        .catch(cb);
    });

    // apply flow items
    await async.eachLimit(flowItems, 5, (item, cb) => {
      applyDraftData(item);

      item.markModified('draftData');
      item.save(options)
        .then(() => cb())
        .catch(cb);
    });

    await async.eachLimit([...surveyItems, ...contentItems, ...surveyThemes], 5, (item, cb) => {
      item.applyDraft(options)
        .then(() => cb())
        .catch(cb);
    });

    applyDraftData(this);

    this.updatePreviewScreenShot = true;

    this.markModified('draftData');

    // set question counter
    this.questionsCount = surveyItems
      .filter(({ type }) => ['question', 'trendQuestion'].includes(type))
      .length;

    await this.save(options);
  } catch (e) {
    return Promise.reject(e);
  }
};

// close draft
Survey.schema.methods.closeDraft = async function (options = {}) {
  try {
    const {
      SurveySection,
      SurveyItem,
      SurveyTheme,
      ContentItem,
      FlowItem,
      Trash,
      PulseSurveyDriver
    } = keystone.lists;

    const { _id: survey } = this;

    await Promise.all([
      SurveySection.model.deleteMany({ survey, inDraft: true }, options),
      SurveySection.model.updateMany(
        { survey, inDraft: false },
        { draftRemove: false, draftData: {} },
        options
      ),
      PulseSurveyDriver.model.deleteMany({ survey, inDraft: true }, options),
      PulseSurveyDriver.model.updateMany(
        { survey, inDraft: false },
        { draftRemove: false, draftData: {} },
        options
      ),
      FlowItem.model.deleteMany({ survey, inDraft: true }, options),
      FlowItem.model.updateMany(
        { survey, inDraft: false },
        { draftRemove: false, draftData: {} },
        options
      ),
      Trash.model.deleteMany({ draft: survey, stage: 'inDraft' }, options)
    ]);

    const items = await Promise.all([
      SurveyItem.model.find({ survey, inTrash: { $ne: true } }),
      ContentItem.model.find({ survey, inTrash: { $ne: true } }),
      SurveyTheme.model.find({ survey })
    ]);

    await async.eachLimit(_.flatten(items), 5, (item, cb) => {
      item.closeDraft(options)
        .then(() => cb())
        .catch();
    });

    this.draftData = {};
    this.markModified('draftData');

    await this.save(options);
  } catch (e) {
    return Promise.reject(e);
  }
};

// translate
Survey.schema.methods.translate = applyTranslateMethod();

/**
 * Private
 * ===================
 */

async function _setCounters(originalSurvey, cloneSurvey) {
  // find number of clones to set version name
  const n = await Survey.model
    .find({
      originalSurvey,
      type: cloneSurvey.type,
      company: cloneSurvey.company,
      team: cloneSurvey.team,
      inTrash: { $ne: true }
    })
    .countDocuments();

  if (!n) return;

  // change name for each language
  Object.keys(cloneSurvey.name)
    .filter(lang => cloneSurvey.name[lang])
    .forEach((lang) => {
      const name = cloneSurvey.name[lang];
      const pattern = '000';
      const addZeros = function (acc, current, index) {
        return acc.length <= index ? `0${acc}` : acc;
      };
      const version = function (n, raz) {
        return Array.from(raz)
          .reduce(addZeros, `${n}`);
      };

      cloneSurvey.name[lang] = `${name} ${version(n, pattern)}`;
    });
}

// TODO rewrite
function _countQuizCorrectAnswers(surveyItems, answer) {
  const result = surveyItems.reduce((acc, current) => {
    const question = current.question;
    const answerResult = answer[current._id];

    // return result if question is not present or answer is not present
    if (!question || !answerResult) return acc;

    // process checkboxes as multiple answers
    if (question.type === 'checkboxes') {
      const correctAnswers = question.questionItems.filter(i => i.quizCorrect)
        .map(i => i._id);

      // if answer and correct answers is present process
      if (correctAnswers && correctAnswers.length) {
        // check that all correct answers are present in answer
        const difference = _.xor(correctAnswers.map(i => i.toString()), answerResult);

        // increment if all answers are set
        if (difference.length === 0) return acc + 1;
      }
    }

    // process dropdown and multipleChoice
    if (['dropdown', 'multipleChoice'].includes(question.type)) {
      const correctAnswers = question.questionItems.filter(i => i.quizCorrect);
      const correctIsPresent = _.some(correctAnswers, (a => a._id.toString() === answerResult));

      // increment if all answers are set
      if (correctIsPresent) return acc + 1;
    }

    // process sliders
    if (['slider', 'linearScale'].includes(question.type) && question.quizCondition) {
      const { quizCondition, quizCorrectValue, quizCorrectRange = {} } = question;
      const { from, to } = quizCorrectRange;
      const correctAnswer = parseInt(quizCorrectValue, 10);

      if (quizCondition === 'equal' && correctAnswer === answerResult) {
        return acc + 1;
      }

      if (quizCondition === 'greaterEqual' && correctAnswer <= answerResult) {
        return acc + 1;
      }

      if (quizCondition === 'lessEqual' && correctAnswer >= answerResult) {
        return acc + 1;
      }

      if (quizCondition === 'isBetween' && from && to) {
        if (answerResult >= from && answerResult <= to) return acc + 1;
      }
    }

    // process thumbs
    if (question.type === 'thumbs') {
      const correctAnswer = question.quizCorrectValue;

      if (['yes', 'no'].includes(correctAnswer) && answerResult === correctAnswer) {
        return acc + 1;
      }
    }

    // fallback
    return acc;
  }, 0);

  return result;
}

// add indexes
Survey.schema.index(
  { urlName: 1, company: 1 },
  { unique: true, partialFilterExpression: { urlName: { $exists: true } } }
);

/**
 * Registration
 */
Survey.defaultColumns = 'name.en name.de company team active publicAccess startDate endDate createdAt';
Survey.register();

export default Survey;
