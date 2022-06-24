import async from 'async';
import _ from 'lodash';

// helpers
import translate from '../helpers/translate';
import getLocalizationFields from './getLocalizationFields';

// models
import {
  SurveySection,
  SurveyItem,
  ContentItem,
  Question,
  QuestionItem,
  GridRow,
  GridColumn
} from '../models';
import ContentItemElement from '../models/ContentItemElement';

// apply translate method for entity
export default function applyTranslateMethod() {
  return async function translateFields(options = {}) {
    try {
      const {
        from,
        to,
        session,
        deep = false,
        remove = false,
        switchLanguage = false,
        unsetChanged,
        companyLimitation
      } = options;
      const collection = this.schema.options.collection;

      // get translated fields path
      const fields = getLocalizationFields(collection);

      switch (true) {
        case remove: {
          fields.forEach((field) => {
            _.set(this, `draftData.${field}.${from}`, null);

            if (unsetChanged) {
              _.set(this, `draftData.${field}Changed`, false);
            }

            _.set(this, `draftData.translation.${from}`, false);
          });

          break;
        }
        case switchLanguage: {
          // skip draft translation
          this._skipHandleDraftTranslation = true;

          const fieldsToTranslate = fields
            .filter(field => !_.get(this, `draftData.${field}.${to}`, _.get(this, `${field}.${to}`)))
            .filter(field => _.get(this, `draftData.${field}.${from}`, _.get(this, `${field}.${from}`)));

          await _translateFields({
            doc: this,
            fields: fieldsToTranslate,
            from,
            to,
            companyLimitation
          });

          break;
        }
        default: {
          if (this.pulseParent) {
            const entity = await _checkParentTranslate({ collection, _id: this.pulseParent });

            if (!entity) {
              await _translateFields({ doc: this, fields, from, to, companyLimitation });
            }

            fields.forEach((field) => {
              // get text for translation
              const text = _.get(this, `draftData.${field}.${from}`) || _.get(this, `${field}.${from}`);

              // do translate if field not empty
              if (text) {
                const localizationField = _.get(entity, `${field}.${to}`);

                // set result to draft data
                _.set(this, `draftData.${field}.${to}`, localizationField);
              }
            });

            break;
          }
          await _translateFields({ doc: this, fields, from, to, companyLimitation });
        }
      }

      // translate related entities
      if (deep) {
        // get related to collection entities
        const entities = await _getEntitiesToTranslate({ collection, context: this });

        // call translate method on each entity
        await async.eachLimit(entities, 5, (entity, cb) => {
          entity
            .translate(options)
            .then(() => cb())
            .catch(cb);
        });
      }

      // set markModified on draftData to save results of translation
      this.markModified('draftData');

      await this.save({ session });
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

function _checkParentTranslate(options = {}) {
  const { collection, _id } = options;

  switch (collection) {
    case 'Question': {
      return Question.model.findById(_id);
    }
    case 'SurveySection': {
      return SurveySection.model.findById(_id);
    }
    default: {
      return {};
    }
  }
}

// get entities related to current document for deep translation
async function _getEntitiesToTranslate(options = {}) {
  try {
    const { collection, context } = options;
    const { _id, question } = context;

    switch (collection) {
      case 'Survey': {
        const [
          surveySections,
          contents
        ] = await Promise.all([
          SurveySection.model.find({
            survey: _id,
            draftRemove: { $ne: true }
          }),
          ContentItem.model.find({
            survey: _id,
            draftRemove: { $ne: true },
            inTrash: { $ne: true },
            type: { $in: ['startPage', 'endPage'] }
          })
        ]);

        return [
          ...surveySections,
          ...contents
        ];
      }
      case 'SurveySection':
        return SurveyItem.model
          .find({
            draftRemove: { $ne: true },
            $or: [
              { 'draftData.surveySection': _id, },
              { surveySection: _id, 'draftData.surveySection': { $exists: false } },
            ]
          });
      case 'SurveyItem': {
        const [
          questionDoc,
          contents
        ] = await Promise.all([
          Question.model
            .findOne({
              _id: question,
              trend: false,
              general: false,
              draftRemove: { $ne: true },
              inTrash: { $ne: true }
            }),
          ContentItem.model
            .find({
              draftRemove: { $ne: true },
              inTrash: { $ne: true },
              $or: [
                { 'draftData.surveyItem': _id },
                { surveyItem: _id, 'dratData.surveyItem': { $exists: false } }
              ]
            })
        ]);

        const res = [...contents];
        if (questionDoc) res.push(questionDoc);

        return res;
      }
      case 'Question': {
        const [
          questionItems,
          gridRows,
          gridColumns
        ] = await Promise.all([
          QuestionItem.model.find({
            question: _id,
            draftRemove: { $ne: true },
            inTrash: { $ne: true },
          }),
          GridRow.model.find({
            question: _id,
            draftRemove: { $ne: true },
            inTrash: { $ne: true },
          }),
          GridColumn.model.find({
            question: _id,
            draftRemove: { $ne: true },
            inTrash: { $ne: true },
          })
        ]);

        return [
          ...questionItems,
          ...gridRows,
          ...gridColumns
        ];
      }
      case 'ContentItem': {
        const contentItemElements = await ContentItemElement.model.find({
          draftRemove: { $ne: true },
          contentItem: _id
        });

        return contentItemElements;
      }
      default:
        return [];
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

async function _translateFields(options = {}) {
  try {
    const { doc, fields, from, to, companyLimitation } = options;

    await async.eachLimit(fields, 5, (field, cb) => {
      // get text for translation
      const text = _.get(doc, `draftData.${field}.${from}`) || _.get(doc, `${field}.${from}`);

      // do translate if field not empty
      if (text) {
        return translate(text, { from, to }, companyLimitation)
          .then((result) => {
            // set result to draft data
            _.set(doc, `draftData.${field}.${to}`, result);

            cb();
          }).catch(cb);
      }

      cb();
    });
  } catch (e) {
    return Promise.reject(e);
  }
}
