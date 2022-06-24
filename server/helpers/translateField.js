import _ from 'lodash';
import translate from '../helpers/translate';

export default async function translateField(doc, translations, field, currentTranslationLang) {
  const langs = Object.keys(translations.toObject()).filter(i => translations[i]);

  for (const lang of langs) {
    // check if translation is not locked
    const translationAvailable = !doc[`translationLock${_.upperFirst(field)}`][lang];

    if (lang !== currentTranslationLang && translationAvailable) {
      // TODO research for another translations APIs
      // TODO refactor to move to one method
      doc[field][lang] = await translate(
        doc[field][currentTranslationLang],
        { from: currentTranslationLang, to: lang }
      );
    }
  }
}
