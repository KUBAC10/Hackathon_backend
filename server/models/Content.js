// base
import keystone from 'keystone';
import _ from 'lodash';
import translate from '../helpers/translate';

// helpers
import { contentLabels, contentMessages, contentErrors } from '../helpers/contentData';

// services
import APIMessagesExtractor from '../services/APIMessagesExtractor';

// config
import { localizationList } from '../../config/localization';

const Types = keystone.Field.Types;

/**
 * Content Model
 * =============
 */
const Content = new keystone.List('Content', {
  label: 'Content',
  plural: 'Contents',
  track: true
});

const favicon16x16 = new keystone.Storage({
  adapter: keystone.Storage.Adapters.FS,
  fs: {
    path: './public/uploads/content/favicon/favicon16x16',
    publicPath: '/uploads/content/favicon/favicon16x16/',
  },
  schema: {
    url: true
  },
});

const favicon32x32 = new keystone.Storage({
  adapter: keystone.Storage.Adapters.FS,
  fs: {
    path: './public/uploads/content/favicon/favicon32x32',
    publicPath: '/uploads/content/favicon/favicon32x32/',
  },
  schema: {
    url: true
  },
});

Content.add(
  'Main Data', {
    name: { type: String },
    nameShort: {
      type: Types.Select,
      options: localizationList.reduce((acc, lang) => `${acc},${lang}`, 'none'),
      default: 'none',
      note: 'Using for api request, please don\'t edit, if you not sure what are you doing'
    },
    translate: {
      type: Boolean,
      default: false,
      note: 'Apply checkbox to translate content from english to it language'
    },
    favicon16x16: {
      type: Types.File,
      storage: favicon16x16,
      note: 'Favicon 16x16 px, available formats are: png, svg, ico, jpeg'
    },
    favicon32x32: {
      type: Types.File,
      storage: favicon32x32,
      note: 'Favicon 32x32 px, available formats are: png, svg, ico, jpeg'
    },
  },

  'Labels', {
    labels: contentLabels
  },

  'API Messages',

  'Contact Us Messages', {
    apiMessages: { contactUs: contentMessages.contactUs }
  },

  'User Messages', {
    apiMessages: { contactUs: contentMessages.user }
  },

  'Emails Messages', {
    apiMessages: { email: contentMessages.email }
  },

  'Registration', {
    apiMessages: { registration: contentMessages.registration }
  },

  'Company', {
    apiMessages: { company: contentMessages.company }
  },

  'Survey Messages', {
    apiMessages: { survey: contentMessages.survey }
  },

  'Quiz Messages', {
    apiMessages: { quiz: contentMessages.quiz }
  },

  'Invite Messages', {
    apiMessages: { invite: contentMessages.invite }
  },

  'API Errors',

  'Common Errors', {
    apiErrors: { global: contentErrors.global }
  },

  'User Errors', {
    apiErrors: { user: contentErrors.user }
  },

  'Invite Errors', {
    apiErrors: { invite: contentErrors.invite }
  },
  'Tag Entity Errors', {
    apiErrors: { tagEntity: contentErrors.tagEntity }
  },

  'Email Errors', {
    apiErrors: { email: contentErrors.email }
  },

  'Mailer Errors', {
    apiErrors: { mailer: contentErrors.mailer }
  },

  'Password Errors', {
    apiErrors: { password: contentErrors.password }
  },

  'Questions', {
    apiErrors: { question: contentErrors.question }
  },

  'Surveys', {
    apiErrors: { survey: contentErrors.survey }
  },

  'Survey Results', {
    apiErrors: { surveyResult: contentErrors.surveyResult }
  },

  'Templates', {
    apiErrors: { template: contentErrors.template }
  },

  'Company', {
    apiErrors: { company: contentErrors.company }
  }
);
//console.log(Content.field('name'))
Content.schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    // remove $Lock fields from labels
    Object.keys(ret.labels).forEach((key) => {
      if (key.includes('$Lock')) delete ret.labels[key];
    });

    return ret;
  }
});

// TODO remove "for of" logic - make calls in parallel
Content.schema.pre('save', async function (next) {
  try {
    if (this.isModified('translate') && this.translate) {
      const labels = Object.keys(this.labels);
      // translate labels
      for (const label of labels) {
        if (!this.labels[`${label}$Lock`]) {
          let translationLabel = await translate(
            this.labels[label], { from: 'en', to: this.nameShort }
          );

          // keep variables raw
          translationLabel = translationLabel.replace('$ {', '${');

          this.labels[label] = _.capitalize(translationLabel);
        }
      }

      // translate API messages
      const messagesModels = Object.keys(this.apiMessages);

      for (const model of messagesModels) {
        if (this.apiMessages[model]) {
          for (const key of Object.keys(this.apiMessages[model])) {
            if (this.apiMessages[model][key] && !this.apiMessages[model][`${key}$Lock`]) {
              let translationLabel = await translate(
                this.apiMessages[model][key], { from: 'en', to: this.nameShort }
              );

              // keep variables raw
              translationLabel = translationLabel.replace('$ {', '${');

              this.apiMessages[model][key] = _.capitalize(translationLabel);
            }
          }
        }
      }

      // translate API errors
      const errorsModels = Object.keys(this.apiErrors);

      for (const model of errorsModels) {
        if (this.apiErrors[model]) {
          for (const key of Object.keys(this.apiErrors[model])) {
            if (this.apiErrors[model][key] && !this.apiErrors[model][`${key}$Lock`]) {
              let translationLabel = await translate(
                this.apiErrors[model][key], { from: 'en', to: this.nameShort }
              );

              // keep variables raw
              translationLabel = translationLabel.replace('$ {', '${');

              this.apiErrors[model][key] = _.capitalize(translationLabel);
            }
          }
        }
      }

      this.translate = false; // toggle checkbox
    }

    next();
  } catch (e) {
    return next(e);
  }
});

Content.schema.pre('save', async function (next) {
  await APIMessagesExtractor.setData(this.nameShort, this.apiErrors, this.apiMessages, this.labels);
  next();
});

/**
 * Registration
 */
Content.defaultColumns = 'name createdAt';
Content.register();

export default Content;
