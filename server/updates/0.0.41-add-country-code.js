import { Country } from '../models';

// countries data
import data from './countries';

export default async function addCountryCode(done) {
  try {
    // update countries name
    await Promise.all([
      Country.model.updateOne({ name: 'Bosnia and Herzegowina' }, { $set: { name: 'Bosnia and Herzegovina' } }),
      Country.model.updateOne({ name: 'Cape Verde' }, { $set: { name: 'Cabo Verde' } }),
      Country.model.updateOne({ name: 'Congo, the Democratic Republic of the' }, { $set: { name: 'Congo (Democratic Republic of the)' } }),
      Country.model.updateOne({ name: 'Cote d`Ivoire' }, { $set: { name: 'Côte d\'Ivoire' } }),
      Country.model.updateOne({ name: 'Croatia (Hrvatska)' }, { $set: { name: 'Croatia' } }),
      Country.model.updateOne({ name: 'East Timor' }, { $set: { name: 'Timor-Leste' } }),
      Country.model.updateOne({ name: 'Heard and Mc Donald Islands' }, { $set: { name: 'Heard Island and McDonald Islands' } }),
      Country.model.updateOne({ name: 'Holy See (Vatican City State)' }, { $set: { name: 'Holy See' } }),
      Country.model.updateOne({ name: 'Korea, Democratic People`s Republic of' }, { $set: { name: 'Korea (Democratic People\'s Republic of)' } }),
      Country.model.updateOne({ name: 'Korea, Republic of' }, { $set: { name: 'Korea (Republic of)' } }),
      Country.model.updateOne({ name: 'Lao, People`s Democratic Republic' }, { $set: { name: 'Lao People\'s Democratic Republic' } }),
      Country.model.updateOne({ name: 'Libyan Arab Jamahiriya' }, { $set: { name: 'Libya' } }),
      Country.model.updateOne({ name: 'Macau' }, { $set: { name: 'Macao' } }),
      Country.model.updateOne({ name: 'Macedonia, The Former Yugoslav Republic of' }, { $set: { name: 'Macedonia (the former Yugoslav Republic of)' } }),
      Country.model.updateOne({ name: 'Micronesia, Federated States of' }, { $set: { name: 'Micronesia (Federated States of)' } }),
      Country.model.updateOne({ name: 'Moldova, Republic of' }, { $set: { name: 'Moldova (Republic of)' } }),
      Country.model.updateOne({ name: 'Reunion' }, { $set: { name: 'Réunion' } }),
      Country.model.updateOne({ name: 'Slovakia (Slovak Republic)' }, { $set: { name: 'Slovakia' } }),
      Country.model.updateOne({ name: 'St. Helena' }, { $set: { name: 'Saint Helena, Ascension and Tristan da Cunha' } }),
      Country.model.updateOne({ name: 'St. Pierre and Miquelon' }, { $set: { name: 'Saint Pierre and Miquelon' } }),
      Country.model.updateOne({ name: 'Svalbard and Jan Mayen Islands' }, { $set: { name: 'Svalbard and Jan Mayen' } }),
      Country.model.updateOne({ name: 'Vietnam' }, { $set: { name: 'Viet Nam' } }),
      Country.model.updateOne({ name: 'Wallis and Futuna Islands' }, { $set: { name: 'Wallis and Futuna' } }),
      Country.model.updateOne({ name: 'Taiwan, Province of China' }, { $set: { name: 'Taiwan' } }),
      Country.model.updateOne({ name: 'United Kingdom' }, { $set: { name: 'United Kingdom of Great Britain and Northern Ireland' } }),
      Country.model.updateOne({ name: 'United States' }, { $set: { name: 'United States of America' } }),
      Country.model.updateOne({ name: 'Venezuela' }, { $set: { name: 'Venezuela (Bolivarian Republic of)' } }),
    ]);

    // get county cursor
    const cursor = Country.model
      .find()
      .lean()
      .cursor();

    for (let country = await cursor.next(); country != null; country = await cursor.next()) {
      const countryData = data.find(d => d.name === country.name);

      if (countryData) {
        await Country.model.updateOne(
          { _id: country._id },
          { $set: { code: countryData.code } }
        );
      }
    }

    done();
  } catch (e) {
    console.error('Updates error: add country code', e);
    done(e);
  }
}
