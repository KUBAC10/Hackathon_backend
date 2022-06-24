import _ from 'lodash';
import keystone from 'keystone';
import mongoose from 'mongoose';
import moment from 'moment';
import async from 'async';
import request from 'superagent';

// models
import {
  Survey,
  SurveyItem,
  Team,
  QuestionStatistic,
  Webhook
} from './index';

// services
import {
  APIMessagesExtractor
} from '../services';

import config from '../../config/env';

// helpers
import APIError from '../helpers/APIError';
import {
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
} from '../helpers/transactions';
import { checkLimit, handleLimit, handleNotEmptyResponses } from '../helpers/limitation';

const ValidationError = mongoose.Error.ValidationError;
const ValidatorError = mongoose.Error.ValidatorError;

const Types = keystone.Field.Types;

/**
 * Survey Result Model
 * ===================
 */
const SurveyResult = new keystone.List('SurveyResult', {
  track: true
});

SurveyResult.add(
  {
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
      // required: true TODO: For public results?
    },
    contact: {
      type: Types.Relationship,
      ref: 'Contact',
      initial: true,
      // required: true
    },
    email: {
      type: String
    },
    assets: {
      type: Types.Relationship,
      ref: 'Asset',
      many: true,
      index: true,
      initial: true,
    },
    pulseSurveyRound: {
      type: Types.Relationship,
      ref: 'PulseSurveyRound'
    },
    target: {
      type: Types.Relationship,
      ref: 'Target'
    },
    surveyCampaign: {
      type: Types.Relationship,
      ref: 'SurveyCampaign'
    },
    tags: {
      type: Types.Relationship,
      ref: 'Tag',
      many: true
    },
    tagsString: {
      type: String
    },
    recipient: {
      type: Types.Relationship,
      ref: 'PulseSurveyRecipient'
    },
    step: {
      type: Number,
      default: 0
    },
    token: {
      type: String,
      note: 'for any API actions'
    },
    fingerprintId: {
      type: String,
      note: 'Required for public survey. Identify anonymous users.'
    },
    completed: {
      type: Boolean,
      default: false
    },
    empty: {
      type: Boolean,
      default: true
    },
    startedAt: {
      type: Types.Datetime
    },
    lastCompletedAt: {
      type: Types.Datetime
    },
    fake: {
      type: Boolean,
      initial: false,
      default: false
    },
    preview: {
      type: Boolean,
      initial: false,
      default: false
    },
    stepHistory: {
      type: Types.NumberArray,
      initial: true,
      required: true,
      default: []
    },
    questionStepHistory: {
      type: Types.TextArray,
      default: []
    },
    quizCorrect: {
      type: Number
    },
    quizTotal: {
      type: Number
    },
    clientIp: { type: String },
    location: {
      coordinates: {
        lat: { type: String },
        lng: { type: String }
      },
      formattedAddress: { type: String },
      country: { type: String },
      region: { type: String },
      city: { type: String },
      zip: { type: String }
    },
    device: { type: String },
    hide: {
      type: Boolean
    },
    scorePoints: {
      type: Number
    }
  }
);

// add meta
SurveyResult.schema.add({ meta: { type: Object } });

// add answer (for segments querying)
SurveyResult.schema.add({
  answer: {
    type: Object,
    initial: true,
    default: {}
  }
});

SurveyResult.schema.virtual('invite', {
  ref: 'Invite',
  localField: 'token',
  justOne: true,
  foreignField: 'token'
});

SurveyResult.schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    /* istanbul ignore next */
    delete ret._;
    /* istanbul ignore next */
    return ret;
  }
});

// set oldComplete value
SurveyResult.schema.post('init', function () {
  const oldThis = this.toObject();
  this._oldCompleted = oldThis.completed;
  this._oldEmpty = oldThis.empty;
});

/**
 * Save
 * ===================
 */
// start session
SurveyResult.schema.pre('save', async function (next) {
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
SurveyResult.schema.pre('save', async function (next) {
  try {
    if (this.isNew && !this.preview) await checkLimit(this);
  } catch (e) {
    return next(e);
  }
});

// handle errors
SurveyResult.schema.pre('save', async function (next) {
  try {
    const error = new ValidationError(this);
    const message = await APIMessagesExtractor.getError(this._lang, 'global.somethingWentWrong');

    // validate presence of IP or token
    if (!this.token && !this.fingerprintId) {
      error.errors.public = new ValidatorError({ message });
    }

    if (Object.keys(error.errors).length) return next(error);

    next();
  } catch (e) {
    next(e);
  }
});

// TODO - rework answering process(move all logic to the model)
SurveyResult.schema.pre('save', async function (next) {
  try {
    /** Process survey answer. Example of items structure
     answer = {
         surveyItemId: value any of 'string', 'number', 'boolean',
         ['string', 'number', 'boolean', { row: rowId, column: columnId }]
       }
     * */
    if (this._answer && this._surveySection) {
      this.markModified('answer');
      this.empty = false;
      this._statisticData = [];

      // set defaults
      if (!this.answer) this.answer = {};
      if (!this.answer.skipped) this.answer.skipped = [];
      if (!this.answer.flow) this.answer.flow = [];

      this.answer.flow.push(_.last(this.stepHistory));

      // time of related current question statistic
      const time = moment(this.createdAt).startOf('hour').toDate();

      // process each surveyItem in section (only one on singe question flow)
      for (const surveyItem of this._surveySection.surveyItems) {
        const answer = this._answer[surveyItem._id];
        const prevAnswer = this.answer[surveyItem._id];
        const customAnswer = this._answer[`${surveyItem._id}_customAnswer`];
        const prevCustomAnswer = _.get(this.answer, `${surveyItem._id}.customAnswer`);
        const skipped = answer === undefined // increment skipped counter
          && !customAnswer
          && !this.answer.skipped.includes(surveyItem._id.toString());
        const answered = (answer || _.isNumber(answer) || customAnswer)
          && this.answer[surveyItem._id] === undefined; // increment answered counter

        // if no answer handle skipped array and process question statistic
        if (skipped) {
          // remove answer if it exists before
          this.answer = _.omit(this.answer, surveyItem._id);
          // add it to array of skipped surveyItems
          this.answer.skipped = _.uniq([...this.answer.skipped, surveyItem._id.toString()]);
        }

        if (answer || customAnswer || _.isNumber(answer)) {
          this.answer.skipped = this.answer.skipped.filter(i => i !== surveyItem._id.toString());
        }

        if (answer || customAnswer || _.isNumber(answer)) {
          // TODO rebuild
          // process grid answer - multipleChoiceGrid, checkboxGrid
          if (['multipleChoiceMatrix', 'checkboxMatrix'].includes(surveyItem.question.type)) {
            // init answer data
            this.answer[surveyItem._id] = { crossings: [] };

            // get row, column ids
            const rowIds = surveyItem.question.gridRows.map(i => i._id.toString());
            const columnIds = surveyItem.question.gridColumns.map(i => i._id.toString());

            // validate presence of valid row, column ids
            const uniqGivenRows = _.uniq(answer.map(i => i.row));
            const uniqGivenColumns = _.uniq(answer.map(i => i.column));

            let error;
            uniqGivenRows.forEach((row) => {
              if (!rowIds.includes(row)) {
                error = new APIError(`Invalid row id - ${row}`, 400);
                return error;
              }
            });
            if (error) return next(error);

            uniqGivenColumns.forEach((column) => {
              if (!columnIds.includes(column)) {
                error = new APIError(`Invalid column id - ${column}`, 400);
                return error;
              }
            });

            if (error) return next(error);

            this.answer[surveyItem._id].crossings
              .push(...answer.map(i => ({ gridRow: i.row, gridColumn: i.column })));
          } else {
            const newAnswer = {};
            // TODO: Remove validation logic. It was processed in validateAnswerData helper.
            switch (surveyItem.question.type) {
              case 'thumbs':
              case 'text': {
                newAnswer.value = answer.toString();
                break;
              }
              case 'linearScale':
              case 'netPromoterScore':
              case 'slider': {
                newAnswer.value = parseInt(answer, 10);

                if (customAnswer) newAnswer.customAnswer = customAnswer;

                break;
              }
              case 'countryList': {
                newAnswer.country = answer.toString();
                break;
              }
              default: {
                if (answer) newAnswer.questionItems = _.flatten([answer]);
                newAnswer.customAnswer = customAnswer;
              }
            }

            // set answer data
            this.answer[surveyItem._id] = _.pickBy(newAnswer, (value, key) => {
              if (!['value', 'country', 'questionItems', 'customAnswer'].includes(key)) return false;

              if (value === 0) return true;

              return _.identity(value, key);
            });
          }
        }

        if (surveyItem.question) {
          const statistic = {
            time,
            skipped,
            answered,
            surveyItem: surveyItem._id,
            question: surveyItem.question._id,
            pulseSurveyRound: this.pulseSurveyRound,
            pulseSurveyDriver: this._surveySection.pulseSurveyDriver,
            surveyCampaign: this.surveyCampaign,
            tags: this.tags,
            target: this.target,
          };

          if (surveyItem.question.type !== 'text') {
            statistic.answer = answer;
            statistic.customAnswer = !!customAnswer;
            statistic.prevAnswer = prevAnswer;
            statistic.prevCustomAnswer = !!prevCustomAnswer;
          }

          this._statisticData.push(statistic);
        }
      }
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// create tags string
SurveyResult.schema.pre('save', async function(next) {
  try {
    if ((this.isModified('tags') || this.isNew) && this.tags && this.tags.length) {
      this.tagsString = this.tags
        .filter(i => !!i)
        .map(i => i.toString())
        .sort() // sort array of ids
        .join('#');
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// increment total results if result is not empty
SurveyResult.schema.pre('save', async function (next) {
  try {
    if (!this._answer || this.empty || this._reanswer || this.preview) return next();

    if (this.isNew || this._oldEmpty) {
      if (!this.device && this._devices) {
        this.device = Object.keys(this._devices)
          .find(device => this._devices[device]);
      }

      // inc totalResults
      await Survey.model.updateOne(
        { _id: this.survey },
        { $inc: { totalResults: 1 } }
      );

      await handleNotEmptyResponses(this);
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// increment totalCompleted and set lastAnswerDate if survey result is completed
// set location data from IP address
SurveyResult.schema.pre('save', async function (next) {
  try {
    if (!this.completed || this.hide || this._reanswer || this.preview) return next();

    if (this.isModified('completed') && !this._oldCompleted) {
      const updateData = {
        $inc: { totalCompleted: 1 }, // increment totalCompleted counter
      };

      // set updatedAt as lastAnswerDate to survey if present
      if (this.updatedAt) updateData.lastAnswerDate = this.updatedAt;

      this.lastCompletedAt = moment();

      // TODO move to Survey static method
      await Survey.model.updateOne(
        { _id: this.survey },
        updateData
      );
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// commit session
SurveyResult.schema.pre('save', async function (next) {
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

// handle statistic
SurveyResult.schema.post('save', async function () {
  if (this.preview || this.hide || !this._statisticData || !this._statisticData.length) return;

  if (this._answer || this._skippedByFlow) {
    await _retry({ func: _incrementQuestionStatistic, attr: this._statisticData });

    delete this._answer;
  }
});

// set location data
SurveyResult.schema.post('save', async function () {
  try {
    if (this._clientIp && this._clientIp !== this.clientIp) {
      if (config.env === 'production') _getLocationByIp(this);
    }
  } catch (e) {
    return console.error(e);
  }
});

/**
 * Webhooks
 * ===================
 */
// process "optionSelected" webhook
SurveyResult.schema.post('save', async function () {
  try {
    if (this._optionSelectedWH && typeof this._optionSelectedWH === 'object') {
      const webhooks = await Webhook.model
        .find({
          company: this.company,
          $or: [
            { type: 'optionSelected' },
            { type: '*' }
          ]
        });
      if (!webhooks.length) return false;

      // load survey item and question data
      const surveyItemId = Object.keys(this._optionSelectedWH)[0];
      if (!surveyItemId) return false;
      const surveyItem = await SurveyItem.model
        .findById(surveyItemId)
        .populate({
          path: 'question',
          select: 'name',
          populate: {
            path: 'questionItems',
            select: 'name'
          }
        })
        .populate({
          path: 'team',
          select: 'name'
        });
      if (!surveyItem || !surveyItem.question) return false;

      const data = {
        surveyItemId: surveyItem._id,
        timestamp: moment().format('X'),
        meta: this.meta,
        question: surveyItem.question.toObject(),
        team: surveyItem.team,
        answer: this._optionSelectedWH[surveyItemId]
      };

      for (const webhook of webhooks) {
        webhook.processData(data, 'optionSelected');
      }
    }
  } catch (e) {
    return console.error(e);
  }
});

// process "surveyComplete" webhook
SurveyResult.schema.post('save', async function () {
  try {
    // if "completed" had changed from "false" to "true"
    if (!this._oldCompleted && this.completed) {
      const webhooks = await Webhook.model
        .find({
          company: this.company,
          $or: [
            { type: 'surveyCompleted' },
            { type: '*' }
          ]
        });
      if (!webhooks.length) return false;

      let team;
      if (this.team) team = await Team.model.findOne({ _id: this.team }, 'name').lean();

      const data = {
        team,
        timestamp: moment().format('X'),
        meta: this.meta
      };

      for (const webhook of webhooks) {
        webhook.processData(data, 'surveyCompleted');
      }
    }
  } catch (e) {
    return console.error(e);
  }
});

// handle company limit
SurveyResult.schema.post('save', async function (next) {
  try {
    if (this._limit && !this.preview) await handleLimit(this._limit);
  } catch (e) {
    return next(e);
  }
});

/**
 * Remove
 * ===================
 */
// start remove session
SurveyResult.schema.pre('remove', async function (next) {
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

// Clear related entities
SurveyResult.schema.pre('remove', async function (next) {
  try {
    const { Invite, SurveyItem } = keystone.lists;
    // remove invite
    if (this.token) {
      const invite = await Invite.model.findOne({ token: this.token });
      if (invite) await invite.remove({ session: this.currentSession });
    }

    // handle statistic
    const surveyItems = await SurveyItem.model.find({ survey: this.survey }).select('_id question').lean();

    // make attributes
    const attr = surveyItems.map(i => ({
      time: moment(this.createdAt).startOf('hour').toDate(),
      surveyItem: i._id,
      question: i.question
    }));

    if (attr.length) {
      await _retry({ attr, func: _markToUpdateQuestionStatistic });
    }

    next();
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// commit remove session
SurveyResult.schema.pre('remove', async function (next) {
  try {
    if (this._innerSession) await commitTransaction(this.currentSession);
    next();
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

async function _retry(options = {}) {
  try {
    const { n = 5, x = 0, func, attr } = options;
    if (x <= n) await func(attr);
  } catch (e) {
    options.x += 1;
    await _retry(options);
  }
}

async function _incrementQuestionStatistic(statistic) {
  try {
    await async.eachLimit(statistic, 5, (s, cb) => {
      const {
        surveyItem,
        question,
        time,
        answer,
        prevAnswer,
        customAnswer,
        prevCustomAnswer,
        skipped,
        answered,
        skippedByFlow,
        pulseSurveyRound,
        pulseSurveyDriver,
        surveyCampaign,
        target,
        tags
      } = s;

      const query = {
        surveyItem,
        question,
        time
      };

      if (pulseSurveyRound) query.pulseSurveyRound = pulseSurveyRound;
      if (pulseSurveyDriver) query.pulseSurveyDriver = pulseSurveyDriver;
      if (surveyCampaign) query.surveyCampaign = surveyCampaign;
      if (target) query.target = target;
      if (tags && tags.length) {
        query.tagsString = tags.map(t => t.toString()).sort().join('#');
      }

      // find or create QuestionStatistic
      QuestionStatistic.model
        .findOne(query)
        .then((doc) => {
          if (!doc) {
            doc = new QuestionStatistic.model(query);

            if (tags && tags.length) doc.tags = tags;
          }
          // inti data object if not exist
          if (!doc.data) doc.data = {};

          if (customAnswer) doc.data.customAnswer = (parseInt(doc.data.customAnswer, 10) || 0) + 1;

          // handle data
          if (answer && _.isArray(answer)) {
            answer.forEach((d) => {
              if (d.row && d.column) {
                const key = `${d.row}#${d.column}`;
                doc.data[key] = (parseInt(doc.data[key], 10) || 0) + 1;
              } else {
                doc.data[d] = (parseInt(doc.data[d], 10) || 0) + 1;
              }
            });
          }

          if (answer !== undefined && !_.isArray(answer)) {
            doc.data[answer] = (parseInt(doc.data[answer], 10) || 0) + 1;
          }

          // decrement by prev answer
          if (prevAnswer !== undefined) {
            // decrement crossings
            if (prevAnswer.crossings && prevAnswer.crossings.length) {
              prevAnswer.crossings.forEach(({ gridRow, gridColumn }) => {
                const key = `${gridRow}#${gridColumn}`;

                doc.data[key] = (parseInt(doc.data[key], 10) || 1) - 1;
              });
            }

            // decrement question items
            if (prevAnswer.questionItems && prevAnswer.questionItems.length) {
              prevAnswer.questionItems.forEach((item) => {
                doc.data[item] = (parseInt(doc.data[item], 10) || 1) - 1;
              });
            }

            if (prevAnswer.country !== undefined) {
              doc.data[prevAnswer.country] = (parseInt(doc.data[prevAnswer.country], 10) || 1) - 1;

              if (doc.data[prevAnswer.country] === 0) delete doc.data[prevAnswer.country];
            }

            if (prevAnswer.value !== undefined) {
              doc.data[prevAnswer.value] = (parseInt(doc.data[prevAnswer.value], 10) || 1) - 1;
            }
          }

          // decrement custom answer
          if (prevCustomAnswer) {
            doc.data.customAnswer = (parseInt(doc.data.customAnswer, 10) || 1) - 1;
          }

          // increment skipped/answered counters
          if (skipped) doc.skipped += 1;
          if (answered) doc.answered += 1;
          if (skippedByFlow) doc.skippedByFlow += 1;

          // save questionStatistic
          doc.syncDB = false;
          doc.markModified('data');
          doc.save()
            .then(() => cb())
            .catch(cb);
        }).catch(cb);
    });
  } catch (e) {
    console.error(e);
  }
}

async function _markToUpdateQuestionStatistic(items) {
  try {
    await async.eachLimit(items, 5, (item, cb) => {
      QuestionStatistic.model
        .updateOne(item, { $set: { syncDB: false } })
        .then(() => cb())
        .catch(cb);
    });
  } catch (e) {
    console.error(e);
  }
}

async function _getLocationByIp(context) {
  try {
    if (context._clientIp && context._clientIp !== '::1') {
      const res = await request.get(
        `http://api.ipstack.com/${context._clientIp}`, // TODO switch to https after premium plan
        { access_key: config.ipStackKey }
      );

      const { error, latitude, longitude, region_name, city, country_name, zip } = res.body;

      if (error || !country_name || !region_name || !city || !zip) return false;

      const location = {
        coordinates: {
          lat: latitude,
          lng: longitude
        },
        formattedAddress: `${region_name}, ${city}, ${country_name}, ${zip}`,
        country: country_name,
        region: region_name,
        city,
        zip
      };

      await SurveyResult.model
        .updateOne({
          _id: context._id
        }, {
          $set: {
            location,
            clientIp: context._clientIp
          }
        });
    }
  } catch (e) {
    return console.error(e);
  }
}

// TODO: Add unique indexes by user/survey???
/**
 * Registration
 */
SurveyResult.defaultColumns = 'survey company team createdAt';
SurveyResult.register();

export default SurveyResult;
