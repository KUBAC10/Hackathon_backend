import chai, { expect } from 'chai';
import app from 'index'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import { TagEntity } from 'server/models';

// factories
import {
  tagFactory,
  tagEntityFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

let tag;

async function makeTestData() {
  tag = await tagFactory({});
}

describe('Tag Model', () => {
  describe('Pre remove', () => {
    before(cleanData);

    before(makeTestData);

    it('should clear related tag entities', async () => {
      const tagEntity = await tagEntityFactory({ tag });
      await tag.remove();

      const reloadedTagEntity = await TagEntity.model.findById(tagEntity);
      expect(reloadedTagEntity).to.be.eq(null);
    });
  });
});
