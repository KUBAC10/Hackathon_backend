import chai, { expect } from 'chai';
import app from 'index'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import {
  User
} from 'server/models';

// factories
import {
  contentFactory,
  companyFactory
} from 'server/tests/factories';

// services
import APIMessagesExtractor from 'server/services/APIMessagesExtractor';

// attributes
import { attributes as userAttributes } from 'server/tests/factories/user.factory';

chai.config.includeStack = true;

let content;
let company;
let attributes;

async function makeTestData() {
  [
    company,
    content,
    attributes,
  ] = await Promise.all([
    companyFactory({}, true),
    contentFactory({}, true),
    userAttributes({}, true)
  ]);

  await APIMessagesExtractor.loadData();
}

describe('User Model', () => {
  describe('Pre save', () => {
    beforeEach(cleanData);

    beforeEach(makeTestData);

    describe('When items was given', () => {
      it('should return error for wrong team id', async () => {
        try {
          const user = new User.model({ ...attributes });
          user.items = { teams: [company._id.toString()] };
          await user.save();
        } catch (e) {
          expect(e.message).to.be.eq(content.apiErrors.global.somethingWentWrong);
        }
      });
    });
  });
});
