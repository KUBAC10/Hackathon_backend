import { default as translationLib } from 'translate';
import he from 'he';
import config from '../../config/env';

function localeParser(lang) {
  switch (lang) {
    case 'zh-hant':
    case 'zh-Hant': // return 'zh' locale to Chinese (Tradition) due to ISO 639-1 restrictions
      return 'zh';
    default:
      return lang;
  }
}

/**
 * Translate given text to another language
 * @param  {string} text
 * @param  {obj} options
 * @param  {string} options.from - "from" text translation language
 * @param  {string} options.to - "to" translation language
 * @param  {boolean} isHtml - parse html before translate
 * @param  {obj} companyLimitation - if present also handle limits
 * @return {string} translation
 */
export default async function translate(text, { from, to }, companyLimitation) {
  try {
    if (typeof text !== 'string') return '';

    // TODO research for another translations APIs
    if (config.env === 'test') return `translated to ${to}`;

    // handle input html make array of strings skip tags
    const textArray = he
      .decode(text)
      .replace(/<\/?[^>]+(>|$)/g, '')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length);

    // join string of text
    const textString = textArray.join('<x>');

    let translatedString = '';

    if (textString && textString.length) {
      // TODO - count also for non-lite companies?
      // companyLimitation present - check if have remain translations
      let translationsRemain = true;

      if (companyLimitation) {
        translationsRemain = companyLimitation.translationChars >= textString.length;
      }

      if (translationsRemain && textString.length < 2000) {
        // translate call
        translatedString = await translationLib(textString, {
          from: localeParser(from),
          to: localeParser(to),
          engine: 'google',
          key: process.env.GOOGLE_API_KEY
        });

        // update counters
        if (companyLimitation) {
          try {
            companyLimitation.translationChars -= textString.length;
            await companyLimitation.save();
          } catch (e) {
            console.log(e, 'companyLimitation update translationChars error');
          }
        }

        // split back string to array
        const translatedArray = translatedString.split('<x>');

        // replace text in html to translated
        textArray.forEach((original, index) => (
          translatedString = translatedString.replace(original, translatedArray[index])
        ));
      } else {
        // set default text if limit if reached
        translatedString = text;
      }
    }

    //  exception for translation and saving empty value
    if (translatedString === '') translatedString = '\n';
    // remove special charters
    // he.decode('foo &copy; bar &ne; baz &#x1D306; qux');
    // // → 'foo © bar ≠ baz 𝌆 qux'
    return he.decode(translatedString || '');
  } catch (e) {
    return Promise.reject(e);
  }
}
