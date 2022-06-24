import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  questionFactory,
  userFactory,
  companyFactory,
  questionItemFactory,
  gridRowFactory,
  gridColumnFactory,
  teamFactory
} from '../../../../factories';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'test@email.com';

let itemQuestion;
let gridQuestion;
let sliderQuestion;
let company;
let team;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  [
    itemQuestion,
    gridQuestion,
    sliderQuestion
  ] = await Promise.all([
    questionFactory({
      company,
      description: { en: 'hi' },
      placeholder: { en: 'hi' },
      type: 'dropdown'
    }),
    questionFactory({
      company,
      description: { en: 'hi' },
      placeholder: { en: 'hi' },
      type: 'checkboxMatrix'
    }),
    questionFactory({
      company,
      description: { en: 'hi' },
      placeholder: { en: 'hi' },
      type: 'slider',
      fromCaption: { en: 'hi' },
      toCaption: { en: 'hi' }
    })
  ]);

  await Promise.all([
    questionItemFactory({ question: itemQuestion }),
    questionItemFactory({ question: itemQuestion }),
    questionItemFactory({ question: itemQuestion }),
    gridRowFactory({ question: gridQuestion }),
    gridRowFactory({ question: gridQuestion }),
    gridColumnFactory({ question: gridQuestion }),
    gridColumnFactory({ question: gridQuestion }),
  ]);

  await userFactory({ email, password, isPowerUser: true, company });
}

describe('## PUT /api/v1/questions/:id/translate', () => {
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

    it('should translate question and question items fields', async () => {
      const res = await agent
        .put(`/api/v1/questions/${itemQuestion._id}/translate`)
        .send({ from: 'en', to: 'ru' })
        .expect(httpStatus.OK);
      const translated = res.body;

      expect(translated.name.ru).to.match(/ru$/);
      expect(translated.description.ru).to.match(/ru$/);
      expect(translated.placeholder.ru).to.match(/ru$/);
      expect(translated.translation.ru).to.be.eq(true);

      for (const item of translated.questionItems) {
        expect(item.name.ru).to.match(/ru$/);
      }
    });

    it('should translate question and grids fields', async () => {
      const res = await agent
        .put(`/api/v1/questions/${gridQuestion._id}/translate`)
        .send({ from: 'en', to: 'ru' })
        .expect(httpStatus.OK);
      const translated = res.body;

      expect(translated.name.ru).to.match(/ru$/);
      expect(translated.description.ru).to.match(/ru$/);
      expect(translated.placeholder.ru).to.match(/ru$/);
      expect(translated.translation.ru).to.be.eq(true);

      for (const grid of [...translated.gridRows, ...translated.gridColumns]) {
        expect(grid.name.ru).to.match(/ru$/);
      }
    });

    it('should translate question and caption fields', async () => {
      const res = await agent
        .put(`/api/v1/questions/${sliderQuestion._id}/translate`)
        .send({ from: 'en', to: 'ru' })
        .expect(httpStatus.OK);
      const translated = res.body;

      expect(translated.name.ru).to.match(/ru$/);
      expect(translated.description.ru).to.match(/ru$/);
      expect(translated.placeholder.ru).to.match(/ru$/);
      expect(translated.linearScale.fromCaption.ru).to.match(/ru$/);
      expect(translated.linearScale.toCaption.ru).to.match(/ru$/);
      expect(translated.translation.ru).to.be.eq(true);
    });

    it('should translate fields after update', async () => {
      // create new question
      const res1 = await agent
        .post('/api/v1/questions')
        .send({
          general: true,
          trend: true,
          type: 'dropdown',
          name: { en: 'Question' },
          translation: { en: true },
          questionItems: [{ name: { en: 'Option 1' } }]
        })
        .expect(httpStatus.CREATED);

      // translate question
      const res2 = await agent
        .put(`/api/v1/questions/${res1.body._id}/translate`)
        .send({ from: 'en', to: 'de' })
        .expect(httpStatus.OK);

      // add new question item
      res2.body.questionItems.push({ name: { de: 'Option de' } });
      res2.body.translation = { de: true };

      // update question
      const res3 = await agent
        .put(`/api/v1/questions/${res2.body._id}`)
        .send(res2.body)
        .expect(httpStatus.CREATED);

      for (const item of res3.body.questionItems) {
        expect(item.name.en).to.match(/en$/);
        expect(item.name.de).to.match(/de$/);
      }
    });

    it('should reject not found', async () => {
      await agent
        .put(`/api/v1/questions/${company._id}/translate`)
        .send({ from: 'en', to: 'ru' })
        .expect(httpStatus.NOT_FOUND);
    });

    it('should translate net promoter score comments', async () => {
      const question = await questionFactory({
        company,
        team,
        type: 'netPromoterScore',
        detractorsComment: { en: 'detractorsComment' },
        passivesComment: { en: 'passivesComment' },
        promotersComment: { en: 'promotersComment' },
      });

      const res = await agent
        .put(`/api/v1/questions/${question._id}/translate`)
        .send({ from: 'en', to: 'ru' })
        .expect(httpStatus.OK);

      expect(res.body.detractorsComment.ru).to.match(/ru$/);
      expect(res.body.passivesComment.ru).to.match(/ru$/);
      expect(res.body.promotersComment.ru).to.match(/ru$/);
    });
  });
});
