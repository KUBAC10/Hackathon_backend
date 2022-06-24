import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';
import _ from 'lodash';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import { Question } from 'server/models';

// attributes
import { attributes as questionAttributes } from 'server/tests/factories/question.factory';

// factories
import {
  companyFactory,
  teamFactory,
  userFactory,
  teamUserFactory
} from '../../../../factories';

chai.config.includeStack = true;

let teamUser;
let teamUser2;
let team;
let team2;
let company;
const password = 'qwe123qwe';
const email = 'test@email.com';
const email2 = 'test2@email.com';
const email3 = 'test3@email.com';
const email4 = 'test4@email.com';

const questionTypes = [
  { type: 'text', trend: true, placeholder: { en: 'You answer' } },
  { type: 'multipleChoice', trend: true },
  { type: 'checkboxes', trend: true },
  { type: 'dropdown', trend: true },
  { type: 'linearScale', trend: true, linearScale: { from: 1, to: 10, icon: 'star' } },
  { type: 'thumbs', trend: true },
  { type: 'netPromoterScore', trend: true },
  { type: 'slider', trend: true, linearScale: { from: 1, to: 10 } },
  { type: 'multipleChoiceMatrix', trend: true },
  { type: 'checkboxMatrix', trend: true },
  { type: 'imageChoice', trend: true },
];

const imageChoice = {
  gallery: {
    type: 'imageChoice',
    trend: true,
    name: { en: 'Test' },
    questionItems: [{ name: { en: 'test' }, icon: 'pie', bgImage: '#EEF1F4' }, { name: { en: 'test1' } }]
  },
  unsplash: {
    type: 'unsplash',
    trend: true,
    name: { en: 'Test' },
    questionItems: [{
      name: { en: 'test' },
      unsplashUrl: 'https://images.unsplash.com/photo-1541890289-cf02a6cff2e3?ixid=MnwxMjU1NTJ8MHwxfHJhbmRvbXx8fHx8fHx8fDE2NTExNDQ0MDU&ixlib=rb-1.2.1&q=50&w=2000'
    },
    { name: { en: 'test1' } }
    ]
  },
};

async function makeTestData() {
  // create company, team and question item
  company = await companyFactory({});
  team = await teamFactory({ company });
  team2 = await teamFactory({ company });

  for (const question of questionTypes) {
    const attr = await questionAttributes(question);
    Object.assign(question, { ..._.merge(question, attr) });
  }
  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Template Maker
  await userFactory({ email: email4, password, company, currentTeam: team, isTemplateMaker: true });

  // create Team user
  teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });

  // create Team user from another team
  teamUser2 = await userFactory({ email: email3, password, company, currentTeam: team2 });
  await teamUserFactory({ user: teamUser2, team: team2, company });
}

describe('## POST /api/v1/questions', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('As Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
      });

      describe('should create question by each type', () => {
        questionTypes.forEach((attr) => {
          it(`${attr.type}`, async () => {
            const res = await agent
              .post('/api/v1/questions')
              .send({ ...attr })
              .expect(httpStatus.CREATED);

            expect(res.body).to.be.an('object');
            expect(res.body.type).to.be.eq(attr.type);
          });
        });
      });

      describe('should create question with relative question items', () => {
        questionTypes.forEach((attr) => {
          it(`${attr.type}`, async () => {
            const res = await agent
              .post('/api/v1/questions')
              .send({
                ...attr,
                questionItems: [{ name: { en: 'test' } }, { name: { en: 'test1' } }]
              })
              .expect(httpStatus.CREATED);

            expect(res.body).to.be.an('object');
            expect(res.body.type).to.be.eq(attr.type);

            const question = await Question.model
              .findById(res.body._id)
              .populate('questionItems')
              .select('questionItems')
              .lean();

            expect(question.questionItems.length).to.be.eq(2);
            expect(question.questionItems[0].sortableId).to.be.eq(0);
            expect(question.questionItems[1].sortableId).to.be.eq(1);
          });
        });
      });

      describe('should create imageChoice question with gallery dataType', async () => {
        const res = await agent
          .post('/api/v1/questions')
          .send(imageChoice.gallery)
          .expect(httpStatus.CREATED);

        expect(res.body).to.be.an('object');
        expect(res.body.type).to.be.eq(imageChoice.gallery.type);

        const question = await Question.model
          .findById(res.body._id)
          .populate('questionItems')
          .select('questionItems')
          .lean();

        expect(question.questionItems.length).to.be.eq(2);
        expect(question.questionItems[0].sortableId).to.be.eq(0);
        expect(question.questionItems[1].sortableId).to.be.eq(1);
        expect(question.questionItems[0].icon).to.be.eq(imageChoice.gallery.questionItems[0].icon);
        expect(question.questionItems[0].bgImage)
          .to
          .be
          .eq(imageChoice.gallery.questionItems[0].bgImage);
      });

      describe('should create imageChoice question with unsplash dataType', async () => {
        const res = await agent
          .post('/api/v1/questions')
          .send(imageChoice.unsplash)
          .expect(httpStatus.CREATED);

        expect(res.body).to.be.an('object');
        expect(res.body.type).to.be.eq(imageChoice.unsplash.type);

        const question = await Question.model
          .findById(res.body._id)
          .populate('questionItems')
          .select('questionItems')
          .lean();

        expect(question.questionItems.length).to.be.eq(2);
        expect(question.questionItems[0].sortableId).to.be.eq(0);
        expect(question.questionItems[1].sortableId).to.be.eq(1);
        expect(question.questionItems[0].unsplashUrl)
          .to
          .be
          .eq(imageChoice.gallery.questionItems[0].unsplash);
      });

      describe('Validation errors', () => {
        describe('should return error when question not trend or general', () => {
          questionTypes.forEach((attr) => {
            it(`${attr.type}`, async () => {
              const res = await agent
                .post('/api/v1/questions')
                .send({ ...attr, trend: false, general: false })
                .expect(httpStatus.BAD_REQUEST);

              expect(res.body.message.general).to.be.eq('Question should be at least general or trend');
            });
          });
        });

        describe('should return error when translation not present', () => {
          questionTypes.forEach((attr) => {
            it(`${attr.type}`, async () => {
              const res = await agent
                .post('/api/v1/questions')
                .send({ ...attr, translation: undefined })
                .expect(httpStatus.BAD_REQUEST);

              expect(res.body.message.translation).to.be.eq('Is required');
            });
          });
        });

        describe('should return errors from questions where linearScale values is required', () => {
          const questions = questionTypes.filter(q => ['linearScale', 'slider'].includes(q.type));

          questions.forEach((attr) => {
            it(`${attr.type} required linearScale field`, async () => {
              const res = await agent
                .post('/api/v1/questions')
                .send({ ...attr, linearScale: undefined })
                .expect(httpStatus.BAD_REQUEST);

              expect(res.body.message.linearScale).to.be.eq('Is required');
            });
          });
        });

        it('should return errors from linearScale question when from to and icon values not present', async () => {
          const res = await agent
            .post('/api/v1/questions')
            .send({
              type: 'linearScale',
              translation: { en: true },
              linearScale: {}
            })
            .expect(httpStatus.BAD_REQUEST);

          expect(res.body.message['linearScale.from']).to.be.eq('Is required');
          expect(res.body.message['linearScale.to']).to.be.eq('Is required');
          expect(res.body.message['linearScale.icon']).to.be.eq('Is required');
        });

        it('should return errors from slider question when from and to values not present', async () => {
          const res = await agent
            .post('/api/v1/questions')
            .send({
              type: 'slider',
              translation: { en: true },
              linearScale: {}
            })
            .expect(httpStatus.BAD_REQUEST);

          expect(res.body.message['linearScale.from']).to.be.eq('Is required');
          expect(res.body.message['linearScale.to']).to.be.eq('Is required');
        });
      });
    });

    describe('As Team User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      describe('should create question by each type', () => {
        questionTypes.forEach((attr) => {
          it(`${attr.type}`, async () => {
            const res = await agent
              .post('/api/v1/questions')
              .send({ ...attr })
              .expect(httpStatus.CREATED);

            expect(res.body).to.be.an('object');
            expect(res.body.type).to.be.eq(attr.type);
          });
        });
      });

      describe('should create question with relative question items', () => {
        questionTypes.forEach((attr) => {
          it(`${attr.type}`, async () => {
            const res = await agent
              .post('/api/v1/questions')
              .send({
                ...attr,
                questionItems: [{ name: { en: 'test' } }, { name: { en: 'test1' } }]
              })
              .expect(httpStatus.CREATED);

            expect(res.body).to.be.an('object');
            expect(res.body.type).to.be.eq(attr.type);

            const question = await Question.model
              .findById(res.body._id)
              .populate('questionItems')
              .select('questionItems')
              .lean();

            expect(question.questionItems.length).to.be.eq(2);
            expect(question.questionItems[0].sortableId).to.be.eq(0);
            expect(question.questionItems[1].sortableId).to.be.eq(1);
          });
        });
      });

      describe('should create imageChoice question with gallery dataType', async () => {
        const res = await agent
          .post('/api/v1/questions')
          .send(imageChoice.gallery)
          .expect(httpStatus.CREATED);

        expect(res.body).to.be.an('object');
        expect(res.body.type).to.be.eq(imageChoice.gallery.type);

        const question = await Question.model
          .findById(res.body._id)
          .populate('questionItems')
          .select('questionItems')
          .lean();

        expect(question.questionItems.length).to.be.eq(2);
        expect(question.questionItems[0].sortableId).to.be.eq(0);
        expect(question.questionItems[1].sortableId).to.be.eq(1);
        expect(question.questionItems[0].icon).to.be.eq(imageChoice.gallery.questionItems[0].icon);
        expect(question.questionItems[0].bgImage)
          .to
          .be
          .eq(imageChoice.gallery.questionItems[0].bgImage);
      });

      describe('should create imageChoice question with unsplash dataType', async () => {
        const res = await agent
          .post('/api/v1/questions')
          .send(imageChoice.unsplash)
          .expect(httpStatus.CREATED);

        expect(res.body).to.be.an('object');
        expect(res.body.type).to.be.eq(imageChoice.unsplash.type);

        const question = await Question.model
          .findById(res.body._id)
          .populate('questionItems')
          .select('questionItems')
          .lean();

        expect(question.questionItems.length).to.be.eq(2);
        expect(question.questionItems[0].sortableId).to.be.eq(0);
        expect(question.questionItems[1].sortableId).to.be.eq(1);
        expect(question.questionItems[0].unsplashUrl)
          .to
          .be
          .eq(imageChoice.gallery.questionItems[0].unsplash);
      });

      describe('Validation errors', () => {
        describe('should return error when question not trend or general', () => {
          questionTypes.forEach((attr) => {
            it(`${attr.type}`, async () => {
              const res = await agent
                .post('/api/v1/questions')
                .send({ ...attr, trend: false, general: false })
                .expect(httpStatus.BAD_REQUEST);

              expect(res.body.message.general).to.be.eq('Question should be at least general or trend');
            });
          });
        });

        describe('should return error when translation not present', () => {
          questionTypes.forEach((attr) => {
            it(`${attr.type}`, async () => {
              const res = await agent
                .post('/api/v1/questions')
                .send({ ...attr, translation: undefined })
                .expect(httpStatus.BAD_REQUEST);

              expect(res.body.message.translation).to.be.eq('Is required');
            });
          });
        });

        describe('should return errors from questions where linearScale values is required', () => {
          const questions = questionTypes.filter(q => ['linearScale', 'slider'].includes(q.type));

          questions.forEach((attr) => {
            it(`${attr.type} required linearScale field`, async () => {
              const res = await agent
                .post('/api/v1/questions')
                .send({ ...attr, linearScale: undefined })
                .expect(httpStatus.BAD_REQUEST);

              expect(res.body.message.linearScale).to.be.eq('Is required');
            });
          });
        });

        it('should return errors from linearScale question when from to and icon values not present', async () => {
          const res = await agent
            .post('/api/v1/questions')
            .send({
              type: 'linearScale',
              translation: { en: true },
              linearScale: {}
            })
            .expect(httpStatus.BAD_REQUEST);

          expect(res.body.message['linearScale.from']).to.be.eq('Is required');
          expect(res.body.message['linearScale.to']).to.be.eq('Is required');
          expect(res.body.message['linearScale.icon']).to.be.eq('Is required');
        });

        it('should return errors from slider question when from and to values not present', async () => {
          const res = await agent
            .post('/api/v1/questions')
            .send({
              type: 'slider',
              translation: { en: true },
              linearScale: {}
            })
            .expect(httpStatus.BAD_REQUEST);

          expect(res.body.message['linearScale.from']).to.be.eq('Is required');
          expect(res.body.message['linearScale.to']).to.be.eq('Is required');
        });
      });
    });

    describe('As Template Maker', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email4,
            password
          });
      });

      describe('should create question by each type', () => {
        questionTypes.forEach((attr) => {
          it(`${attr.type}`, async () => {
            const res = await agent
              .post('/api/v1/questions')
              .send({ ...attr })
              .expect(httpStatus.CREATED);

            expect(res.body).to.be.an('object');
            expect(res.body.type).to.be.eq(attr.type);
          });
        });
      });

      describe('should create question with relative question items', () => {
        questionTypes.forEach((attr) => {
          it(`${attr.type}`, async () => {
            const res = await agent
              .post('/api/v1/questions')
              .send({
                ...attr,
                questionItems: [{ name: { en: 'test' } }, { name: { en: 'test1' } }]
              })
              .expect(httpStatus.CREATED);

            expect(res.body).to.be.an('object');
            expect(res.body.type).to.be.eq(attr.type);

            const question = await Question.model
              .findById(res.body._id)
              .populate('questionItems')
              .select('questionItems')
              .lean();

            expect(question.questionItems.length).to.be.eq(2);
            expect(question.questionItems[0].sortableId).to.be.eq(0);
            expect(question.questionItems[1].sortableId).to.be.eq(1);
          });
        });
      });

      describe('Validation errors', () => {
        describe('should return error when question not trend or general', () => {
          questionTypes.forEach((attr) => {
            it(`${attr.type}`, async () => {
              const res = await agent
                .post('/api/v1/questions')
                .send({ ...attr, trend: false, general: false })
                .expect(httpStatus.BAD_REQUEST);

              expect(res.body.message.general).to.be.eq('Question should be at least general or trend');
            });
          });
        });

        describe('should return error when translation not present', () => {
          questionTypes.forEach((attr) => {
            it(`${attr.type}`, async () => {
              const res = await agent
                .post('/api/v1/questions')
                .send({ ...attr, translation: undefined })
                .expect(httpStatus.BAD_REQUEST);

              expect(res.body.message.translation).to.be.eq('Is required');
            });
          });
        });

        describe('should return errors from questions where linearScale values is required', () => {
          const questions = questionTypes.filter(q => ['linearScale', 'slider'].includes(q.type));

          questions.forEach((attr) => {
            it(`${attr.type} required linearScale field`, async () => {
              const res = await agent
                .post('/api/v1/questions')
                .send({ ...attr, linearScale: undefined })
                .expect(httpStatus.BAD_REQUEST);

              expect(res.body.message.linearScale).to.be.eq('Is required');
            });
          });
        });

        it('should return errors from linearScale question when from to and icon values not present', async () => {
          const res = await agent
            .post('/api/v1/questions')
            .send({
              type: 'linearScale',
              translation: { en: true },
              linearScale: {}
            })
            .expect(httpStatus.BAD_REQUEST);

          expect(res.body.message['linearScale.from']).to.be.eq('Is required');
          expect(res.body.message['linearScale.to']).to.be.eq('Is required');
          expect(res.body.message['linearScale.icon']).to.be.eq('Is required');
        });

        it('should return errors from slider question when from and to values not present', async () => {
          const res = await agent
            .post('/api/v1/questions')
            .send({
              type: 'slider',
              translation: { en: true },
              linearScale: {}
            })
            .expect(httpStatus.BAD_REQUEST);

          expect(res.body.message['linearScale.from']).to.be.eq('Is required');
          expect(res.body.message['linearScale.to']).to.be.eq('Is required');
        });
      });
    });
  });

  describe('Unauthorized', () => {
    describe('should not create question by each type', () => {
      questionTypes.forEach((attr) => {
        it(`${attr.type}`, async () => {
          await request(app)
            .post('/api/v1/questions')
            .send({ ...attr })
            .expect(httpStatus.UNAUTHORIZED);
        });
      });
    });
  });
});

