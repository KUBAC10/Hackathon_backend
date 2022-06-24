/* eslint-disable */
import chai, { expect } from 'chai';

import app from 'index'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

import { localizeValidations, localizeField, localizationList } from 'config/localization';

chai.config.includeStack = true;

describe('Localization helper', () => {
  before(cleanData);

  xit('should set translation flags as properties of field', async () => {
    const hello = localizeField('general.name');
  });

  xit('should set translation flags to validations params', async () => {
    // const hello = localizeValidations(Joi, 'general.translation');
  });

});

