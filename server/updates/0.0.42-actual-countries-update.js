import { Country } from '../models';

export default async function actualCountriesUpdate(done) {
  try {
    await Promise.all([
      Country.model.deleteOne({ name: 'Yugoslavia' }),
      Country.model.insertMany([
        {
          localization: { en: 'Serbia' },
          name: 'Serbia',
          code: 'RS'
        },
        {
          localization: { en: 'Montenegro' },
          name: 'Montenegro',
          code: 'ME'
        },
        {
          localization: { en: 'Kosovo' },
          name: 'Kosovo',
          code: 'XK'
        }
      ])
    ]);

    done();
  } catch (e) {
    console.error('Updates error: actual countries update', e);
    return done(e);
  }
}
