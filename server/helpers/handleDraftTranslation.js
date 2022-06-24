import _ from 'lodash';
import { localizationList } from '../../config/localization';
import getLocalizationFields from './getLocalizationFields';

// set changed flag for fields if default language field was changed
export default function handleDraftTranslation(doc) {
  // fallback if skip translation
  if (doc._skipHandleDraftTranslation) return;

  const defaultLanguage = _.get(doc, 'draftData.defaultLanguage', doc.defaultLanguage || 'en');
  const translation = _.get(doc, 'draftData.translation', doc.translation || {});
  let fields = getLocalizationFields(doc.schema.options.collection);

  // skip description translation for survey and templates
  if (doc.schema.options.collection === 'Survey') {
    fields = fields.filter(f => f !== 'description');
  }

  if (!defaultLanguage) return;

  // get translation languages
  const languages = Object
    .keys(_.omit(translation, defaultLanguage))
    .filter(lang => translation[lang] && localizationList.includes(lang));

  // return if no translation to another languages
  if (!languages.length) return;

  // set changed flag if doc is new and another fields is empty
  if (doc.isNew) {
    fields
      .filter(field => !_.isEmpty(_.get(doc, field).toObject()))
      .forEach((field) => {
        _.set(doc, `draftData.${field}Changed`, true);

        languages.forEach(lang => _.set(doc, `draftData.${field}.${lang}`, ''));
      });

    return;
  }

  // get default language modified fields
  const modifiedDefaultFields = fields.reduce((acc, field) => {
    const path = `draftData.${field}.${defaultLanguage}`;
    if ((_.get(doc, path) || _.get(doc, path) === '') && doc.isModified(path)) acc.push(field);

    const isFieldTranslated = languages.every((lang) => {
      const path = `draftData.${field}.${lang}`;

      return (_.get(doc, path) || _.get(doc, path) === '') && doc.isModified(path);
    });

    // remove changed flag if translation apply by user
    if (isFieldTranslated) {
      _.unset(doc, `draftData.${field}Changed`);

      doc.markModified(`draftData.${field}Changed`);
    }

    return acc;
  }, []);

  // return if default language field does not translated
  if (!modifiedDefaultFields.length) return;

  // set flag changed if default language field was changed
  modifiedDefaultFields.forEach((field) => {
    // build key for flag field
    const fieldChangedKey = `draftData.${field}Changed`;

    // set flag to draftData
    _.set(doc, fieldChangedKey, true);

    // mark modified flag field to save it
    doc.markModified(fieldChangedKey);
  });
}
