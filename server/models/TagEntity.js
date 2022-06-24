import keystone from 'keystone';
import mongoose from 'mongoose';
// import uniqueValidator from 'mongoose-unique-validator';

// services
import APIMessagesExtractor from '../services/APIMessagesExtractor';

const ValidationError = mongoose.Error.ValidationError;
const ValidatorError = mongoose.Error.ValidatorError;

const Types = keystone.Field.Types;

/**
 * TagEntity Model
 * ===============
 */

const TagEntity = new keystone.List('TagEntity', {
  track: true,
  defaultSort: '-createdAt'
});

TagEntity.add({
  tag: {
    type: Types.Relationship,
    ref: 'Tag',
    initial: true,
    required: true
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true,
    required: true
  },
  contact: {
    type: Types.Relationship,
    ref: 'Contact',
    initial: true,
  },
  question: {
    type: Types.Relationship,
    ref: 'Question',
    initial: true,
  },
  survey: {
    type: Types.Relationship,
    ref: 'Survey',
    initial: true,
  },
  isGlobal: {
    type: Boolean
  }
});

// Relation with
// Contacts
// Questions
// Surveys
// Templates

// Return error if at least one of entities is absent
TagEntity.schema.pre('save', async function (next) {
  try {
    if (!this.contact && !this.question && !this.survey && !this.template) {
      const error = new ValidationError(this);
      // get error text
      const message = await APIMessagesExtractor.getError(this._lang, 'tagEntity.isRequired');
      error.errors.entity = new ValidatorError({ message });
      return next(error);
    }
    next();
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
});

// validate presence of only one entity
TagEntity.schema.pre('save', async function (next) {
  try {
    const entityArray = [this.contact, this.question, this.survey, this.template].filter(Boolean);
    if (entityArray.length > 1) {
      const error = new ValidationError(this);
      // get error text
      const message = await APIMessagesExtractor.getError(this._lang, 'tagEntity.onlyOne');
      error.errors.entity = new ValidatorError({ message });
      return next(error);
    }
    next();
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
});

// // Validate unique scope in company
// TagEntity.schema.pre('save', async function (next) {
//   try {
//     let key;
//     const query = { company: this.company, tag: this.tag };
//     // validate by contact
//     if (this.contact) {
//       query.contact = this.contact;
//       key = 'contact';
//     }
//     // validate by question
//     if (this.question) {
//       query.question = this.question;
//       key = 'question';
//     }
//     // validate by survey
//     if (this.survey) {
//       query.survey = this.survey;
//       key = 'survey';
//     }
//     // validate by template
//     if (this.template) {
//       query.template = this.template;
//       key = 'template';
//     }
//     const doc = await TagEntity.model.findOne(query).lean();
//     if (doc) {
//       const error = new ValidationError(this);
//       // get error text
//       const message = await APIMessagesExtractor.getError(this._lang, `tagEntity.${key}Use`);
//       error.errors[key] = new ValidatorError({ message });
//       return next(error);
//     }
//     next();
//   } catch (e) {
//     /* istanbul ignore next */
//     return next(e);
//   }
// });
//
// TagEntity.schema.plugin(uniqueValidator, { message: 'This {PATH} has already been taken' });

/**
 * Registration
 */
TagEntity.defaultColumns = 'tag company contact question survey template createdAt';
TagEntity.register();

export default TagEntity;
