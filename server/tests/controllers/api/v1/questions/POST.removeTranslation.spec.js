import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// services
import APIMessagesExtractor from 'server/services/APIMessagesExtractor';

// factories
import {
  gridRowFactory,
  gridColumnFactory,
  questionFactory,
  questionItemFactory,
  userFactory,
  companyFactory,
  contentFactory
} from '../../../../factories';

chai.config.includeStack = true;

const email = 'test@email.com';
const password = 'qwe123qwe';

let question;
let question2;
let content;
let company;

async function makeTestData() {
  // create company
  company = await companyFactory({});

  // create question
  question = await questionFactory({
    company,
    translation: { en: true, de: true },
    placeholder: { en: 'You answer' }
  });
  question2 = await questionFactory({ company });

  // create surveyItems, questionItems, gridRows and gridColumns
  await Promise.all([
    questionItemFactory({ question }),
    questionItemFactory({ question }),
    questionItemFactory({ question }),
    gridRowFactory({ question }),
    gridRowFactory({ question }),
    gridRowFactory({ question }),
    gridColumnFactory({ question }),
    gridColumnFactory({ question }),
    gridColumnFactory({ question }),
  ]);

  // create user
  await userFactory({ email, password, company, isPowerUser: true });

  // load content
  content = await contentFactory({});
  await APIMessagesExtractor.loadData();
}

describe('## POST /api/v1/questions/:id/remove-translation', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    const agent = request.agent(app);
    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          login: email,
          password
        });
    });

    it('should remove translation from question and related entities', async () => {
      const res = await agent
        .post(`/api/v1/questions/${question._id.toString()}/remove-translation`)
        .send({ lang: 'en' })
        .expect(httpStatus.OK);

      // reload question
      const reloadQuestion = res.body;

      // expect question
      expect(reloadQuestion.name.en).to.be.eq(undefined);
      expect(reloadQuestion.placeholder.en).to.be.eq(undefined);
      expect(reloadQuestion.translation.en).to.be.eq(false);
      expect(reloadQuestion.translationLockName.en).to.be.eq(false);
      expect(reloadQuestion.translationLockDescription.en).to.be.eq(false);
      // expect question items
      const items = [
        ...reloadQuestion.questionItems,
        ...reloadQuestion.gridRows,
        ...reloadQuestion.gridColumns
      ];

      for (const item of items) {
        expect(item.name.en).to.be.eq(undefined);
        expect(item.translationLock.en).to.be.eq(false);
      }
    });

    it('should return error if language is last', async () => {
      const res = await agent
        .post(`/api/v1/questions/${question2._id.toString()}/remove-translation`)
        .send({ lang: 'en' })
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq(content.apiMessages.survey.lastLang);
    });

    it('should reject not found status', async () => {
      await agent
        .post(`/api/v1/questions/${company._id.toString()}/remove-translation`)
        .send({ lang: 'en' })
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post(`/api/v1/questions/${question._id.toString()}/remove-translation`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
