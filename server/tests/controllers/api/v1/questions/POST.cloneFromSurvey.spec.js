import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import {
  Question,
} from 'server/models';

// factories
import {
  questionFactory,
  companyFactory,
  userFactory,
} from '../../../../factories';

chai.config.includeStack = true;

const email = 'test@email.com';
const password = 'qwe123qwe';

let question;
let company;

async function makeTestData() {
  // create company
  company = await companyFactory({});

  // create user
  await userFactory({ email, password, isPowerUser: true, company });

  // create question
  question = await questionFactory({
    company,
    translation: { en: true, de: true },
    placeholder: { en: 'You answer' }
  });
}

describe('## POST /api/v1/questions/:id/clone-from-survey', () => {
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

    it('should create a copy of question with TREND type', async () => {
      const res = await agent
        .post(`/api/v1/questions/${question._id.toString()}/clone-from-survey`)
        .send({ type: 'trend' });

      const clonedQuestion = await Question.model.findOne({ _id: res.body }).lean();

      expect(res.status).to.be.eq(httpStatus.CREATED);
      expect(clonedQuestion._id.toString()).not.to.be.eq(question._id.toString());
      expect(clonedQuestion.trend).to.be.eq(true);
    });

    it('should create a copy of question with GENERAL type', async () => {
      const res = await agent
        .post(`/api/v1/questions/${question._id.toString()}/clone-from-survey`)
        .send({ type: 'general' });

      const clonedQuestion = await Question.model.findOne({ _id: res.body }).lean();

      expect(res.status).to.be.eq(httpStatus.CREATED);
      expect(clonedQuestion._id.toString()).not.to.be.eq(question._id.toString());
      expect(clonedQuestion.general).to.be.eq(true);
    });

    it('should get BAD REQUEST if survey id is incorrect', async () => {
      await agent
        .post('/api/v1/questions/dummy_id/clone-from-survey')
        .send({ type: 'general' })
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should get BAD REQUEST if type was not provided', async () => {
      await agent
        .post(`/api/v1/questions/${question._id.toString()}/clone-from-survey`)
        .expect(httpStatus.BAD_REQUEST);
    });
  });
});
