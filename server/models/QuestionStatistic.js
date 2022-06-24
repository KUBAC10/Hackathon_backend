import keystone from 'keystone';
import uniqueValidator from 'mongoose-unique-validator';
import mongoose from 'mongoose';
import moment from 'moment';

const Types = keystone.Field.Types;

/**
 * QuestionStatistic Model
 * ===========
 */
const QuestionStatistic = new keystone.List('QuestionStatistic', {
  track: true,
  defaultSort: '-createdAt'
});

QuestionStatistic.add({
  // relations
  surveyItem: {
    type: Types.Relationship,
    ref: 'SurveyItem',
    required: true,
    initial: true,
    many: false,
  },
  question: {
    type: Types.Relationship,
    ref: 'Question',
    required: true,
    initial: true,
    many: false
  },
  pulseSurveyRound: {
    type: Types.Relationship,
    ref: 'PulseSurveyRound'
  },
  pulseSurveyDriver: {
    type: Types.Relationship,
    ref: 'PulseSurveyDriver'
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
  // uniq by tags array create multiple indexes inside single document
  // present array of tags as string to include them to existed compound index
  tagsString: {
    type: String
  },
  // metrics
  statistic: {
    type: Types.Code,
    height: 180,
    language: 'json'
  },
  time: {
    type: Date,
    default: moment().startOf('hour').toDate(),
    required: true,
    initial: true,
    utc: true
  },
  syncDB: {
    type: Boolean,
    default: false,
    initial: true,
  },
  skipped: { // initialize a counter of how many times the question was skipped
    type: Number,
    default: 0
  },
  answered: { // initialize a counter of how many times the question was answered
    type: Number,
    default: 0
  },
  skippedByFlow: {
    type: Number,
    default: 0
  }
});

/*
 * Mongoose loses the ability to auto detect/save those changes.
 * To "tell" Mongoose that the value of a Mixed type has changed,
 * call the .markModified(path) method of the document passing the path
 * to the Mixed type you just changed.
 * */
QuestionStatistic.schema.add({ data: mongoose.Schema.Types.Mixed });

// indexes
QuestionStatistic.schema.index({
  surveyItem: 1,
  question: 1,
  time: 1,
  pulseSurveyRound: 1,
  target: 1,
  surveyCampaign: 1,
  tagsString: 1
  // tags: 1 https://docs.mongodb.com/manual/core/multikey-index-bounds/
}, { unique: true });

QuestionStatistic.schema.plugin(uniqueValidator, { message: 'This {PATH} has already been taken' });

// duplicate data to json to view it in keystone
QuestionStatistic.schema.pre('save', function () { this.statistic = JSON.stringify(this.data); });

// create tags string
QuestionStatistic.schema.pre('save', async function(next) {
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

QuestionStatistic.schema.statics.getFirstLast = async function (query) {
  try {
    return await Promise.all([
      QuestionStatistic.model
        .findOne(query, 'time')
        .sort({ time: 1 })
        .lean(),
      QuestionStatistic.model
        .findOne(query, 'time')
        .sort({ time: -1 })
        .lean(),
    ]);
  } catch (e) {
    return Promise.reject(e);
  }
};


/**
 * Registration
 */
QuestionStatistic.register();

export default QuestionStatistic;
