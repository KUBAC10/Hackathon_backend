import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';
import _ from 'lodash';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

// models
import {
  QuestionItem,
  GridColumn,
  GridRow
} from '../../../../../models';

// factories
import {
  companyFactory,
  teamFactory,
  userFactory,
  questionFactory,
  questionItemFactory,
  teamUserFactory,
  gridRowFactory,
  gridColumnFactory
} from '../../../../factories';

import { attributes as questionAttributes } from '../../../../factories/question.factory';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'test@email.com';
const email2 = 'test2@email.com';
const email3 = 'test3@email.com';
const email4 = 'test4@email.com';
const questionItemsArray = [];
const gridsArray = [];
const questionTypes = [
  { type: 'text', trend: true, placeholder: { en: 'You answer' } },
  { type: 'linearScale', trend: true, linearScale: { from: 1, to: 10, icon: 'star' } },
  { type: 'thumbs', trend: true },
  { type: 'netPromoterScore', trend: true },
  { type: 'slider', trend: true, linearScale: { from: 1, to: 10 } }
];
const itemQuestionTypes = [
  { type: 'multipleChoice', trend: true },
  { type: 'checkboxes', trend: true },
  { type: 'dropdown', trend: true }
];
const gridQuestionTypes = [
  { type: 'multipleChoiceMatrix', trend: true },
  { type: 'checkboxMatrix', trend: true },
];

let team;
let team2;
let company;
let teamUser;
let teamUser2;

async function makeTestData() {
  company = await companyFactory({});
  [
    team,
    team2
  ] = await Promise.all([
    teamFactory({ company }),
    teamFactory({ company })
  ]);

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

  for (const question of questionTypes) {
    const testQuestion = await questionFactory({
      type: question.type,
      company,
      team,
      trend: true,
      createdBy: teamUser
    });

    const attr = await questionAttributes(question);

    Object.assign(question, { ..._.merge(question, attr), testQuestion });
  }

  // create test questions and attributes for update
  for (const question of itemQuestionTypes) {
    const testQuestion = await questionFactory({
      type: question.type,
      company,
      team,
      trend: true,
      createdBy: teamUser
    });

    const questionItems = await Promise.all([
      questionItemFactory({ team, question: testQuestion, sortableId: 0 }),
      questionItemFactory({ team, question: testQuestion, sortableId: 1 }),
      questionItemFactory({ team, question: testQuestion, sortableId: 2 })
    ]);

    questionItemsArray.push(questionItems);

    const attr = await questionAttributes(question);

    Object.assign(question, { ..._.merge(question, attr), testQuestion });
  }

  // create test questions and attributes for update
  for (const question of gridQuestionTypes) {
    const testQuestion = await questionFactory({
      type: question.type,
      company,
      team,
      trend: true,
      createdBy: teamUser
    });

    const gridColumns = await Promise.all([
      gridColumnFactory({ team, question: testQuestion }),
      gridColumnFactory({ team, question: testQuestion }),
      gridColumnFactory({ team, question: testQuestion })
    ]);

    const gridRows = await Promise.all([
      gridRowFactory({ team, question: testQuestion }),
      gridRowFactory({ team, question: testQuestion }),
      gridRowFactory({ team, question: testQuestion })
    ]);

    gridsArray.push({ gridColumns, gridRows });

    const attr = await questionAttributes(question);

    Object.assign(question, { ..._.merge(question, attr), testQuestion });
  }

  // await APIMessagesExtractor.loadData();
}

describe('## PUT /api/v1/questions/:id', () => {
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

      describe('should update questions by each type', () => {
        questionTypes.concat(gridQuestionTypes).forEach((attr) => {
          it(`${attr.type}`, async () => {
            const res = await agent
              .put(`/api/v1/questions/${attr.testQuestion._id}`)
              .send({ ...attr })
              .expect(httpStatus.CREATED);

            expect(res.body.name.en).to.be.eq(attr.name.en);
            expect(res.body.type).to.be.eq(attr.type);
          });
        });
      });

      describe('Should move question items to trash if deleted', () => {
        itemQuestionTypes.forEach((attr, index) => {
          it(`${attr.type}`, async () => {
            const res = await agent
              .put(`/api/v1/questions/${attr.testQuestion._id}`)
              .send({
                ...attr,
                questionItems: [
                  {
                    name: { en: questionItemsArray[index][2].name.en },
                    _id: questionItemsArray[index][2]._id
                  }
                ]
              })
              .expect(httpStatus.CREATED);

            expect(res.body.name.en).to.be.eq(attr.name.en);
            expect(res.body.type).to.be.eq(attr.type);

            const reloadItem = await QuestionItem.model.findById({
              _id: questionItemsArray[index][1]._id, question: attr.testQuestion._id
            });

            expect(reloadItem).to.be.an('object');
            expect(reloadItem.inTrash).to.be.eq(true);
          });
        });

        gridQuestionTypes.forEach((attr, index) => {
          it(`${attr.type}`, async () => {
            const res = await agent
              .put(`/api/v1/questions/${attr.testQuestion._id}`)
              .send({
                ...attr,
                gridRows: [
                  {
                    name: { en: gridsArray[index].gridRows[2].name.en },
                    _id: gridsArray[index].gridRows[2]._id
                  },
                ],
                gridColumns: [
                  {
                    name: { en: gridsArray[index].gridColumns[2].name.en },
                    _id: gridsArray[index].gridColumns[2]._id,
                    score: 10
                  },
                ],
              })
              .expect(httpStatus.CREATED);

            expect(res.body.name.en).to.be.eq(attr.name.en);
            expect(res.body.type).to.be.eq(attr.type);

            const reloadRow = await GridRow.model
              .findById({ _id: gridsArray[index].gridRows[1]._id });
            const reloadColumn = await GridColumn.model
              .findById({ _id: gridsArray[index].gridColumns[1]._id });

            expect(reloadRow).to.be.an('object');
            expect(reloadRow.inTrash).to.be.eq(true);
            expect(reloadColumn).to.be.an('object');
            expect(reloadColumn.inTrash).to.be.eq(true);
          });
        });
      });

      describe('Validation Errors', () => {
        describe('should return error when question not trend or general', () => {
          questionTypes.forEach((attr) => {
            it(`${attr.type}`, async () => {
              const res = await agent
                .put(`/api/v1/questions/${attr.testQuestion._id}`)
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
                .put(`/api/v1/questions/${attr.testQuestion._id}`)
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
                .put(`/api/v1/questions/${attr.testQuestion._id}`)
                .send({ ...attr, linearScale: undefined })
                .expect(httpStatus.BAD_REQUEST);

              expect(res.body.message.linearScale).to.be.eq('Is required');
            });
          });
        });

        it('should return errors from linearScale question when from to and icon values not present', async () => {
          const question = questionTypes.find(q => q.type === 'linearScale');
          const res = await agent
            .put(`/api/v1/questions/${question._id}`)
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
          const question = questionTypes.find(q => q.type === 'slider');
          const res = await agent
            .put(`/api/v1/questions/${question._id}`)
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
      describe('From Current Team', () => {
        const agent = request.agent(app);
        before(async () => {
          await agent
            .post('/api/v1/authentication')
            .send({
              login: email2,
              password
            });
        });

        describe('should update questions by each type', () => {
          questionTypes.concat(gridQuestionTypes).forEach((attr) => {
            it(`${attr.type}`, async () => {
              const res = await agent
                .put(`/api/v1/questions/${attr.testQuestion._id}`)
                .send({ ...attr })
                .expect(httpStatus.CREATED);

              expect(res.body.name.en).to.be.eq(attr.name.en);
              expect(res.body.type).to.be.eq(attr.type);
            });
          });
        });

        describe('Should move question items to trash if deleted', () => {
          itemQuestionTypes.forEach((attr, index) => {
            it(`${attr.type}`, async () => {
              const res = await agent
                .put(`/api/v1/questions/${attr.testQuestion._id}`)
                .send({
                  ...attr,
                  questionItems: [
                    {
                      name: { en: questionItemsArray[index][2].name.en },
                      _id: questionItemsArray[index][2]._id
                    }
                  ]
                })
                .expect(httpStatus.CREATED);

              expect(res.body.name.en).to.be.eq(attr.name.en);
              expect(res.body.type).to.be.eq(attr.type);

              const reloadItem = await QuestionItem.model.findById({
                _id: questionItemsArray[index][1]._id, question: attr.testQuestion._id
              });

              expect(reloadItem).to.be.an('object');
              expect(reloadItem.inTrash).to.be.eq(true);
            });
          });

          gridQuestionTypes.forEach((attr, index) => {
            it(`${attr.type}`, async () => {
              const res = await agent
                .put(`/api/v1/questions/${attr.testQuestion._id}`)
                .send({
                  ...attr,
                  gridRows: [
                    {
                      name: { en: gridsArray[index].gridRows[2].name.en },
                      _id: gridsArray[index].gridRows[2]._id
                    },
                  ],
                  gridColumns: [
                    {
                      name: { en: gridsArray[index].gridColumns[2].name.en },
                      _id: gridsArray[index].gridColumns[2]._id,
                      score: 10
                    },
                  ],
                })
                .expect(httpStatus.CREATED);

              expect(res.body.name.en).to.be.eq(attr.name.en);
              expect(res.body.type).to.be.eq(attr.type);

              const reloadRow = await GridRow.model
                .findById({ _id: gridsArray[index].gridRows[1]._id });
              const reloadColumn = await GridColumn.model
                .findById({ _id: gridsArray[index].gridColumns[1]._id });

              expect(reloadRow).to.be.an('object');
              expect(reloadRow.inTrash).to.be.eq(true);
              expect(reloadColumn).to.be.an('object');
              expect(reloadColumn.inTrash).to.be.eq(true);
            });
          });
        });

        describe('Validation Errors', () => {
          describe('should return error when question not trend or general', () => {
            questionTypes.forEach((attr) => {
              it(`${attr.type}`, async () => {
                const res = await agent
                  .put(`/api/v1/questions/${attr.testQuestion._id}`)
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
                  .put(`/api/v1/questions/${attr.testQuestion._id}`)
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
                  .put(`/api/v1/questions/${attr.testQuestion._id}`)
                  .send({ ...attr, linearScale: undefined })
                  .expect(httpStatus.BAD_REQUEST);

                expect(res.body.message.linearScale).to.be.eq('Is required');
              });
            });
          });

          it('should return errors from linearScale question when from to and icon values not present', async () => {
            const question = questionTypes.find(q => q.type === 'linearScale');
            const res = await agent
              .put(`/api/v1/questions/${question._id}`)
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
            const question = questionTypes.find(q => q.type === 'slider');
            const res = await agent
              .put(`/api/v1/questions/${question._id}`)
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

      describe('From Another Team', () => {
        const agent = request.agent(app);
        before(async () => {
          await agent
            .post('/api/v1/authentication')
            .send({
              login: email3,
              password
            });
        });

        describe('should update questions by each type', () => {
          questionTypes.concat(gridQuestionTypes).forEach((attr) => {
            it(`should return forbidden for ${attr.type}`, async () => {
              await agent
                .put(`/api/v1/questions/${attr.testQuestion._id}`)
                .send({ ...attr })
                .expect(httpStatus.FORBIDDEN);
            });

            it(`should return not found for ${attr.type}`, async () => {
              await agent
                .put(`/api/v1/questions/${company._id}`)
                .send({ ...attr })
                .expect(httpStatus.NOT_FOUND);
            });
          });
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

      describe('should update questions by each type', () => {
        questionTypes.concat(gridQuestionTypes).forEach((attr) => {
          it(`${attr.type}`, async () => {
            const res = await agent
              .put(`/api/v1/questions/${attr.testQuestion._id}`)
              .send({ ...attr })
              .expect(httpStatus.CREATED);

            expect(res.body.name.en).to.be.eq(attr.name.en);
            expect(res.body.type).to.be.eq(attr.type);
          });
        });
      });

      describe('Should move question items to trash if deleted', () => {
        itemQuestionTypes.forEach((attr, index) => {
          it(`${attr.type}`, async () => {
            const res = await agent
              .put(`/api/v1/questions/${attr.testQuestion._id}`)
              .send({
                ...attr,
                questionItems: [
                  {
                    name: { en: questionItemsArray[index][2].name.en },
                    _id: questionItemsArray[index][2]._id
                  }
                ]
              })
              .expect(httpStatus.CREATED);

            expect(res.body.name.en).to.be.eq(attr.name.en);
            expect(res.body.type).to.be.eq(attr.type);

            const reloadItem = await QuestionItem.model.findById({
              _id: questionItemsArray[index][1]._id, question: attr.testQuestion._id
            });

            expect(reloadItem).to.be.an('object');
            expect(reloadItem.inTrash).to.be.eq(true);
          });
        });

        gridQuestionTypes.forEach((attr, index) => {
          it(`${attr.type}`, async () => {
            const res = await agent
              .put(`/api/v1/questions/${attr.testQuestion._id}`)
              .send({
                ...attr,
                gridRows: [
                  {
                    name: { en: gridsArray[index].gridRows[2].name.en },
                    _id: gridsArray[index].gridRows[2]._id
                  },
                ],
                gridColumns: [
                  {
                    name: { en: gridsArray[index].gridColumns[2].name.en },
                    _id: gridsArray[index].gridColumns[2]._id,
                    score: 10
                  },
                ],
              })
              .expect(httpStatus.CREATED);

            expect(res.body.name.en).to.be.eq(attr.name.en);
            expect(res.body.type).to.be.eq(attr.type);

            const reloadRow = await GridRow.model
              .findById({ _id: gridsArray[index].gridRows[1]._id });
            const reloadColumn = await GridColumn.model
              .findById({ _id: gridsArray[index].gridColumns[1]._id });

            expect(reloadRow).to.be.an('object');
            expect(reloadRow.inTrash).to.be.eq(true);
            expect(reloadColumn).to.be.an('object');
            expect(reloadColumn.inTrash).to.be.eq(true);
          });
        });
      });

      describe('Validation Errors', () => {
        describe('should return error when question not trend or general', () => {
          questionTypes.forEach((attr) => {
            it(`${attr.type}`, async () => {
              const res = await agent
                .put(`/api/v1/questions/${attr.testQuestion._id}`)
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
                .put(`/api/v1/questions/${attr.testQuestion._id}`)
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
                .put(`/api/v1/questions/${attr.testQuestion._id}`)
                .send({ ...attr, linearScale: undefined })
                .expect(httpStatus.BAD_REQUEST);

              expect(res.body.message.linearScale).to.be.eq('Is required');
            });
          });
        });

        it('should return errors from linearScale question when from to and icon values not present', async () => {
          const question = questionTypes.find(q => q.type === 'linearScale');
          const res = await agent
            .put(`/api/v1/questions/${question._id}`)
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
          const question = questionTypes.find(q => q.type === 'slider');
          const res = await agent
            .put(`/api/v1/questions/${question._id}`)
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
            .put(`/api/v1/questions/${attr.testQuestion._id}`)
            .send({ ...attr })
            .expect(httpStatus.UNAUTHORIZED);
        });
      });
    });
  });
});
