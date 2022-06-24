import keystone from 'keystone';
import moment from 'moment';
import _ from 'lodash';

// models
import { GlobalConfig } from './index';

const Types = keystone.Field.Types;

/**
 * CompanyLimitation Model
 * =============
 */
const CompanyLimitation = new keystone.List('CompanyLimitation', {
  label: 'CompanyLimitation',
  track: true
});

CompanyLimitation.add(
  {
    dropAt: {
      type: Types.Date,
      required: true,
      initial: true,
      utc: true,
      default: moment().add(1, 'month').toDate()
    },
    company: {
      type: Types.Relationship,
      ref: 'Company',
      initial: true,
      required: true
    },
    // limits
    responses: {
      type: Number,
      required: true,
      default: 0
    },
    responsesHide: {
      type: Number,
      required: true,
      default: 0
    },
    invites: {
      type: Number,
      required: true,
      default: 0
    },
    surveys: {
      type: Number,
      required: true,
      default: 0
    },
    questions: {
      type: Number,
      required: true,
      default: 0
    },
    surveySections: {
      type: Number,
      required: true,
      default: 0
    },
    questionItems: {
      type: Number,
      required: true,
      default: 0
    },
    gridRows: {
      type: Number,
      required: true,
      default: 0
    },
    gridColumns: {
      type: Number,
      required: true,
      default: 0
    },
    flowLogic: {
      type: Number,
      required: true,
      default: 0
    },
    flowItems: {
      type: Number,
      required: true,
      default: 0
    },
    contentItems: {
      type: Number,
      required: true,
      default: 0
    },
    surveyReports: {
      type: Number,
      required: true,
      default: 0
    },
    surveyReportItems: {
      type: Number,
      required: true,
      default: 0
    },
    surveyCampaigns: {
      type: Number,
      required: true,
      default: 0
    },
    surveyThemes: {
      type: Number,
      required: true,
      default: 0
    },
    mailers: {
      type: Number,
      required: true,
      default: 0
    },
    translationChars: {
      type: Number,
      required: true,
      default: 0
    }
  }
);

// set default values from global config
CompanyLimitation.schema.pre('save', async function(next) {
  try {
    if (this.isNew) {
      const globalConfig = await GlobalConfig.model
        .findOne({})
        .select('companyLimitation')
        .lean();

      if (globalConfig) _.merge(this, globalConfig.companyLimitation);
    }

    next();
  } catch (e) {
    next(e);
  }
});

/**
 * Registration
 */
CompanyLimitation.defaultColumns = 'company';
CompanyLimitation.register();

export default CompanyLimitation;
