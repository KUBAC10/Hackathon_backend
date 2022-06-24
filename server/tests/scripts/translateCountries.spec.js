import chai, { expect } from 'chai';
import app from 'index'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  countryFactory
} from 'server/tests/factories';

// scripts
import { translateCountries } from 'server/scripts';

// models
import {
  Country
} from 'server/models';

// localization
import { localizationList } from '../../../config/localization';

chai.config.includeStack = true;

let country;

async function makeTestData() {
  [
    country
  ] = await Promise.all([
    countryFactory({}),
    countryFactory({}),
  ]);

  // unset all translations except EN to sample country
  country.localization.name = { en: 'some new' };

  await country.save();
}

describe('Scripts: translate countries', () => {
  describe('Pre save', () => {
    before(cleanData);

    before(makeTestData);

    it('should translate countries to each language of system', async () => {
      // run script
      await translateCountries();

      // reload countries
      const countries = await Country.model.find();

      for (const country of countries) {
        localizationList.forEach(locale =>
          expect(country.localization.name[locale]).to.be.an('string')
        );
      }
    });
  });
});
