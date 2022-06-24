import chai, { expect } from 'chai';
import app from 'index'; // eslint-disable-line

// services
import APIMessagesExtractor from 'server/services/APIMessagesExtractor';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import { TagEntity } from 'server/models';

// factories
import {
  tagFactory,
  surveyFactory,
  contentFactory,
  contactFactory,
  questionFactory,
  tagEntityFactory,
} from 'server/tests/factories';

chai.config.includeStack = true;

let tag;
let survey;
let content;
let contact;
let question;

async function makeTestData() {
  [
    tag,
    content,
    contact,
    question,
    survey,
  ] = await Promise.all([
    tagFactory({}),
    contentFactory({}),
    contactFactory({}),
    questionFactory({}),
    surveyFactory({})
  ]);

  await APIMessagesExtractor.loadData();
}

describe('TagEntity Model', () => {
  describe('Pre save', () => {
    beforeEach(cleanData);

    beforeEach(makeTestData);

    it('should return error when at least one of tag entity is not present', async () => {
      try {
        const tagEntity = new TagEntity.model({ tag, company: tag.company });
        await tagEntity.save();
      } catch (e) {
        expect(e.errors.entity.message).to.be.eq(content.apiErrors.tagEntity.isRequired);
      }
    });

    it('should return error when two or more of tag entity is presence', async () => {
      try {
        const tagEntity = new TagEntity.model({ tag, company: tag.company, contact, question });
        await tagEntity.save();
      } catch (e) {
        expect(e.errors.entity.message).to.be.eq(content.apiErrors.tagEntity.onlyOne);
      }
    });

    it('should return error when entity is already associated with given contact', async () => {
      try {
        await tagEntityFactory({ tag, company: tag.company, contact });
        const tagEntity = new TagEntity.model({ tag, company: tag.company, contact });
        await tagEntity.save();
      } catch (e) {
        expect(e.errors.contact.message).to.be.eq(content.apiErrors.tagEntity.contactUse);
      }
    });

    it('should return error when entity is already associated with given question', async () => {
      try {
        await tagEntityFactory({ tag, company: tag.company, question });
        const tagEntity = new TagEntity.model({ tag, company: tag.company, question });
        await tagEntity.save();
      } catch (e) {
        expect(e.errors.question.message).to.be.eq(content.apiErrors.tagEntity.questionUse);
      }
    });

    it('should return error when entity is already associated with given survey', async () => {
      try {
        await tagEntityFactory({ tag, company: tag.company, survey });
        const tagEntity = new TagEntity.model({ tag, company: tag.company, survey });
        await tagEntity.save();
      } catch (e) {
        expect(e.errors.survey.message).to.be.eq(content.apiErrors.tagEntity.surveyUse);
      }
    });
  });
});
