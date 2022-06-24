import keystone from 'keystone';
import _ from 'lodash';

// helpers
import { checkLimit, handleLimit } from '../helpers/limitation';

const Types = keystone.Field.Types;

export const charts = [
  'linear',
  'column',
  'donut',
  'table',
  'spiderweb',
  'gouge',
  'list',
  'wordCloud',
  'map'
];

const SurveyReportItem = new keystone.List('SurveyReportItem', {
  track: true,
  defaultSort: '-createdAt'
});

SurveyReportItem.add({
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true,
    required: true
  },
  surveyReport: {
    type: Types.Relationship,
    ref: 'SurveyReport',
    initial: true,
    required: true
  },
  surveyItem: {
    type: Types.Relationship,
    ref: 'SurveyItem',
    initial: true,
    required: true
  },
  type: {
    type: Types.Select,
    options: ['surveyReport', 'segments'],
    required: true,
    default: 'surveyReport'
  },
  descriptionShow: {
    type: Boolean
  },
  description: {
    type: String
  },
  chart: {
    type: Types.Select,
    options: charts
  },
  hide: {
    type: Types.Boolean
  },
  hideItems: {
    type: Types.TextArray
  },
  colors: {
    type: Types.TextArray
  },
  skip: {
    type: Number
  },
  limit: {
    type: Number
  }
});

SurveyReportItem.schema.add({ params: { type: Object, default: {} } });

// check company limit
SurveyReportItem.schema.pre('save', async function (next) {
  try {
    if (this.isNew && this.company) await checkLimit(this);
  } catch (e) {
    return next(e);
  }
});

// handle company limit
SurveyReportItem.schema.post('save', async function (next) {
  try {
    if (this._limit) await handleLimit(this._limit);
  } catch (e) {
    return next(e);
  }
});

/**
 * Methods
 * ===================
 */

SurveyReportItem.schema.methods.getClone = async function (session) {
  try {
    const clone = new SurveyReportItem.model(_.omit(this.toObject(), '_id'));

    await clone.save({ session });
  } catch (e) {
    return Promise.reject(e);
  }
};

SurveyReportItem.schema.index({ surveyReport: 1, surveyItem: 1, type: 1 }, { unique: true });

/**
 * Registration
 */
SurveyReportItem.defaultColumns = 'surveyReport surveyItem';
SurveyReportItem.register();

export default SurveyReportItem;
