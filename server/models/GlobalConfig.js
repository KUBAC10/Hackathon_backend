import keystone from 'keystone';
import { localizeField } from '../../config/localization';

const Types = keystone.Field.Types;

/**
 * Global Config Model
 * ===================
 */
const GlobalConfig = new keystone.List('GlobalConfig', {
  nocreate: true,
  nodelete: true,
  label: 'Global Config',
  plural: 'Global Config',
  track: true
});

GlobalConfig.add(
  {
    name: { type: String, noedit: true },
    adminEmail: { type: Types.Email, lowercase: true },
    supportEmail: {
      type: String,
      default: 'team@screver.com'
    },
    primaryContent: {
      type: Types.Relationship,
      ref: 'Content',
      note: 'Would used if app met problems with language loading'
    },
    emailSenderName: {
      type: String,
      default: 'Screver',
      note: 'Name of email sender in app'
    },
    changeEmailLimit: {
      type: Number,
      default: 3,
      note: 'limit of changes email by user'
    },
    footer: localizeField('globalConfig.footer'),
    // default limits for company
    companyLimitation: {
      responses: {
        type: Number,
        default: 10000
      },
      responsesHide: {
        type: Number,
        default: 100
      },
      invites: {
        type: Number,
        default: 500
      },
      surveys: {
        type: Number,
        default: 1000
      },
      questions: {
        type: Number,
        default: 1000
      },
      surveySections: {
        type: Number,
        default: 1000
      },
      questionItems: {
        type: Number,
        default: 2000
      },
      gridRows: {
        type: Number,
        default: 1000
      },
      gridColumns: {
        type: Number,
        default: 1000
      },
      flowLogic: {
        type: Number,
        default: 1000
      },
      flowItems: {
        type: Number,
        default: 1000
      },
      contentItems: {
        type: Number,
        default: 1000
      },
      surveyReports: {
        type: Number,
        default: 1000
      },
      surveyReportItems: {
        type: Number,
        default: 1000
      },
      surveyCampaigns: {
        type: Number,
        default: 1000
      },
      surveyThemes: {
        type: Number,
        default: 1000
      },
      mailers: {
        type: Number,
        default: 1000
      },
      translationChars: {
        type: Number,
        default: 100000
      }
    }
  }
);

/**
 * Registration
 */
GlobalConfig.defaultColumns = 'name adminEmail';
GlobalConfig.register();

export default GlobalConfig;
