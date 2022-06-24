import chai, { expect } from 'chai';
import app from 'index'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import {
  Question,
} from 'server/models';

// factories
import {
  questionFactory,
  contentFactory
} from 'server/tests/factories';

import { attributes as questionAttributes } from 'server/tests/factories/question.factory';
import APIMessagesExtractor from 'server/services/APIMessagesExtractor';

chai.config.includeStack = true;

let content;

async function makeTestData() {
  await questionFactory({});
  content = await contentFactory({});

  await APIMessagesExtractor.loadData();
}

describe('Question Model', () => {
  before(cleanData);

  before(makeTestData);

  describe('Pre save', () => {
    it('should raise error if translation is missing', async () => {
      try {
        const newQuestionAttrs = await questionAttributes({}, true, ['translation']);
        await Question.model.create(newQuestionAttrs);
      } catch (e) {
        expect(e.errors.translation.message)
          .to.be.eq(content.apiErrors.global.translationIsRequired);
      }
    });
  });
});
