import async from 'async';

// models
import { Country } from '../models';

// localization
import { localizationList } from '../../config/localization';

// helpers
import translate from '../helpers/translate';

export default async function translateCountries(session, next) {
  try {
    // get all companies
    const countries = await Country.model.find().select('name localization _id');
    // translate each company on each exist language
    await async.eachLimit(countries, 5, (country, cb) => {
      const translated = Object.keys(country.localization.name)
        .filter(lang => !!country.localization.name[lang])
        .filter(lang => localizationList.includes(lang));
      const translateTo = localizationList.filter(lang => !translated.includes(lang));

      async.each(translateTo, (to, callback) => {
        translate(country.name, { from: 'en', to })
          .then((result) => {
            country.localization.name[to] = result;
            callback();
          })
          .catch(callback);
      }).then(() => {
        country.save(session)
          .then(() => cb())
          .catch(cb);
      }).catch(cb);
    });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}
