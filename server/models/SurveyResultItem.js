import keystone from 'keystone';

const Types = keystone.Field.Types;

/**
 * Survey Result Item Model
 * ========================
 */

const SurveyResultItem = new keystone.List('SurveyResultItem', {
  track: true
});

SurveyResultItem.add(
  {
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
      initial: true,
      required: true
    },
    surveyItem: {
      type: Types.Relationship,
      ref: 'SurveyItem',
      initial: true,
      required: true
    },
    surveyResult: {
      type: Types.Relationship,
      ref: 'SurveyResult',
      initial: true,
      required: true
    },
    question: {
      type: Types.Relationship,
      ref: 'Question',
      initial: true,
      required: true,
    },
    questionItems: {
      type: Types.Relationship,
      ref: 'QuestionItem',
      index: true,
      initial: true,
      many: true
    },
    gridRow: {
      type: Types.Relationship,
      ref: 'GridRow',
      initial: true,
    },
    gridColumn: {
      type: Types.Relationship,
      ref: 'GridColumn',
      initial: true,
    },
    assets: {
      type: Types.Relationship,
      ref: 'Asset',
      many: true,
      index: true,
      initial: true
    },
    value: {
      type: String,
      note: 'for text questions',
      initial: true
    },
    customAnswer: {
      type: String,
      note: 'for custom answers'
    },
    country: {
      type: Types.Relationship,
      ref: 'Country',
      many: false,
    },
    questionType: {
      type: Types.Select,
      options: 'countryList, text, multipleChoice, checkboxes, dropdown, linearScale, thumbs, netPromoterScore, button, slider, multipleChoiceMatrix, checkboxMatrix',
      initial: true,
      required: true,
      default: 'text'
    },
  }
);

SurveyResultItem.schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    /* istanbul ignore next */
    delete ret._;
    /* istanbul ignore next */
    return ret;
  }
});

// Indexes
SurveyResultItem.schema.index({ questionItems: 1, surveyItem: 1 });
SurveyResultItem.schema.index({ gridRow: 1, gridColumn: 1 });
SurveyResultItem.schema.index({ question: 1, surveyItem: 1 });
SurveyResultItem.schema.index({ assets: 1, surveyItem: 1, question: 1 });
SurveyResultItem.schema.index({ question: 1, surveyItem: 1, questionItems: 1 });

SurveyResultItem.schema.statics.getFirstLast = async function (query) {
  try {
    return await Promise.all([
      SurveyResultItem.model
        .findOne(query, 'createdAt')
        .sort({ createdAt: 1 })
        .lean(),
      SurveyResultItem.model
        .findOne(query, 'createdAt')
        .sort({ createdAt: -1 })
        .lean(),
    ]);
  } catch (e) {
    return Promise.reject(e);
  }
};

// TODO: Add validation for question type and presence of question items or value

/**
 * Registration
 */
SurveyResultItem.defaultColumns = 'surveyItem surveyResult questionItem user company team createdAt';
SurveyResultItem.register();

export default SurveyResultItem;
