import keystone from 'keystone';
import { localizeField } from '../../config/localization';

// helpers
import { checkLimit, handleLimit } from '../helpers/limitation';

const Types = keystone.Field.Types;

/**
 * QuizEndPage Model
 * ===================
 */
const QuizEndPage = new keystone.List('QuizEndPage', {
  track: true
});

QuizEndPage.add({
  survey: {
    type: Types.Relationship,
    ref: 'Survey',
    required: true,
    initial: true
  },
  text: localizeField('survey.text'),
  content: localizeField('surveyItem.html'),
  align: {
    type: Types.Select,
    options: 'left, right, center, none',
    default: 'none',
  },
  active: {
    type: Boolean,
    default: false
  },
  html: {
    type: Boolean,
    default: false
  },
  minScore: {
    type: Types.Number,
    required: true,
    initial: true
  },
  maxScore: {
    type: Types.Number,
    required: true,
    initial: true
  }
});

// check company limit
QuizEndPage.schema.pre('save', async function (next) {
  try {
    if (this.isNew && this.company) await checkLimit(this);
  } catch (e) {
    return next(e);
  }
});

// handle company limit
QuizEndPage.schema.post('save', async function (next) {
  try {
    if (this._limit) await handleLimit(this._limit);
  } catch (e) {
    return next(e);
  }
});

/**
 * Registration
 */
QuizEndPage.defaultColumns = 'survey active minScore maxScore createdAt';
QuizEndPage.register();

export default QuizEndPage;
