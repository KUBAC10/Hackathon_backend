import chai, { expect } from 'chai';
import app from 'index'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  surveyFactory,
  surveyItemFactory,
} from 'server/tests/factories';

chai.config.includeStack = true;

let survey;

async function makeTestData() {
  survey = await surveyFactory({});
}

describe('Survey Item Model', () => {
  before(cleanData);

  before(makeTestData);

  describe('Pre save', () => {
    xit('should set sortable id', async () => {
      await surveyItemFactory({ survey });
      const surveyItem = await surveyItemFactory({ survey });
      expect(surveyItem.sortableId).to.be.eq(1);
    });
  });
});
