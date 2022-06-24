import { expect } from 'chai';
import httpStatus from 'http-status';
import moment from 'moment';
import app from 'index';
import request from 'supertest'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// cron
import recountQuestionStatistic from 'server/cron/recountQuestionStatistic';

// factories
import {
  companyFactory,
  teamFactory,
  surveyFactory,
  userFactory,
  surveySectionFactory,
  questionFactory,
  surveyItemFactory,
  surveyResultFactory,
  contactFactory,
  countryFactory,
  assetFactory,
  questionItemFactory,
  gridRowFactory,
  gridColumnFactory
} from '../../../../factories';

const email = 'powerUser@email.com';
const password = 'password';

let team;
let survey;
let surveySection;
let question1;
let question2;
let surveyItem1;
let surveyItem2;
let powerUser;
let contact;
let country1;
let country2;
let asset;
let questionItem11;
let questionItem12;
let questionItem21;
let questionItem22;
let row1;
let row2;
let column11;
let column12;
let column21;

async function makeTestData() {
  // create company and team
  const company = await companyFactory({});
  team = await teamFactory({ company: company._id });

  // create survey
  survey = await surveyFactory({ team });
  survey = survey._id;

  // create surveySection
  surveySection = await surveySectionFactory({ team, survey });
  surveySection = surveySection._id;

  // create countries
  [
    country1,
    country2
  ] = await Promise.all([
    countryFactory({}),
    countryFactory({})
  ]);

  // create asset
  asset = await assetFactory({ team });
  asset = asset._id;

  // create power User
  powerUser = await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create contact
  contact = await contactFactory({ team, user: powerUser });
}

describe('## POST /api/v1/segments/:id', () => {
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

      describe('text', () => {
        const value = 'text text text text text text text text text text';
        const fingerprintId1 = 'text1';
        const fingerprintId2 = 'text2';
        const fingerprintId3 = 'text3';

        before(async () => {
          // create questions
          [
            question1,
            question2
          ] = await Promise.all([
            questionFactory({}),
            questionFactory({}),
          ]);

          // create surveyItems
          [
            surveyItem1,
            surveyItem2
          ] = await Promise.all([
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question1,
            }),
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question2,
            })
          ]);

          // create survey results
          // first for filter matching
          // second from versus
          // third for testing summary versus
          await Promise.all([
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId1 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId2 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId3 })
          ]);

          // make three appropriate answers
          await Promise.all([
            request(app).put('/api/v1/survey-answers').send({
              surveyId: survey,
              fingerprintId: fingerprintId1,
              answer: { [surveyItem1._id]: 'word' }
            }),
            request(app).put('/api/v1/survey-answers').send({
              surveyId: survey,
              fingerprintId: fingerprintId2,
              answer: { [surveyItem1._id]: 'word', [surveyItem2._id]: value }
            }),
            request(app).put('/api/v1/survey-answers').send({
              surveyId: survey,
              fingerprintId: fingerprintId3,
              answer: { [surveyItem1._id]: 'text', [surveyItem2._id]: value }
            })
          ]);
        });

        it('should return correct segments data', async () => {
          const res = await agent
            .post(`/api/v1/segments/${survey._id}`)
            .send({
              surveyItems: [surveyItem2._id],
              answers: [{
                surveyItem: surveyItem1._id,
                value: 'word'
              }]
            })
            .expect(httpStatus.OK);

          expect(res.body.global[0].data[0].value).to.be.eq(20);
        });
      });

      describe('multipleChoice', () => {
        const fingerprintId1 = 'multipleChoice1';
        const fingerprintId2 = 'multipleChoice2';
        const fingerprintId3 = 'multipleChoice3';

        before(async () => {
          // create questions
          [
            question1,
            question2
          ] = await Promise.all([
            questionFactory({ type: 'multipleChoice' }),
            questionFactory({ type: 'multipleChoice' }),
          ]);

          // create surveyItems
          [
            surveyItem1,
            surveyItem2
          ] = await Promise.all([
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question1,
            }),
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question2,
            })
          ]);

          // create questionItems
          [
            questionItem11,
            questionItem12,
            questionItem21,
            questionItem22,
          ] = await Promise.all([
            questionItemFactory({ team, question: question1 }),
            questionItemFactory({ team, question: question1 }),
            questionItemFactory({ team, question: question2 }),
            questionItemFactory({ team, question: question2 })
          ]);

          // create survey results
          // first for filter matching
          // second from versus
          // third for testing summary versus
          await Promise.all([
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId1 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId2 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId3 })
          ]);

          // make three appropriate answers
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId1,
            answer: {
              [surveyItem1._id]: [questionItem11._id]
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId2,
            answer: {
              [surveyItem1._id]: [questionItem11._id],
              [surveyItem2._id]: [questionItem21._id]
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId3,
            answer: {
              [surveyItem1._id]: [questionItem12._id],
              [surveyItem2._id]: [questionItem21._id]
            }
          });
        });

        it('should return correct segments data', async () => {
          await recountQuestionStatistic();
          const res = await agent
            .post(`/api/v1/segments/${survey._id}`)
            .send({
              surveyItems: [surveyItem2._id],
              answers: [{
                surveyItem: surveyItem1._id,
                questionItems: [questionItem11._id]
              }]
            })
            .expect(httpStatus.OK);

          const global = res.body.global[0].data;
          const segment = res.body.segment[0].data;

          expect(global.find(d => d._id === questionItem21._id.toString()).value).to.be.eq(2);
          expect(global.find(d => d._id === questionItem22._id.toString()).value).to.be.eq(0);
          expect(segment.find(d => d._id === questionItem21._id.toString()).value).to.be.eq(1);
          expect(segment.find(d => d._id === questionItem22._id.toString()).value).to.be.eq(0);
        });
      });

      describe('checkboxes', () => {
        const fingerprintId1 = 'checkboxes1';
        const fingerprintId2 = 'checkboxes2';
        const fingerprintId3 = 'checkboxes3';

        before(async () => {
          // create questions
          [
            question1,
            question2
          ] = await Promise.all([
            questionFactory({ type: 'checkboxes' }),
            questionFactory({ type: 'checkboxes' }),
          ]);

          // create surveyItems
          [
            surveyItem1,
            surveyItem2
          ] = await Promise.all([
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question1,
            }),
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question2,
            })
          ]);

          // create questionItems
          [
            questionItem11,
            questionItem12,
            questionItem21,
            questionItem22,
          ] = await Promise.all([
            questionItemFactory({ team, question: question1 }),
            questionItemFactory({ team, question: question1 }),
            questionItemFactory({ team, question: question2 }),
            questionItemFactory({ team, question: question2 })
          ]);

          // create survey results
          // first for filter matching
          // second from versus
          // third for testing summary versus
          await Promise.all([
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId1 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId2 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId3 })
          ]);

          // make three appropriate answers
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId1,
            answer: {
              [surveyItem1._id]: [questionItem11._id]
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId2,
            answer: {
              [surveyItem1._id]: [questionItem11._id],
              [surveyItem2._id]: [questionItem21._id]
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId3,
            answer: {
              [surveyItem1._id]: [questionItem12._id],
              [surveyItem2._id]: [questionItem21._id]
            }
          });
        });

        it('should return correct segments data', async () => {
          const res = await agent
            .post(`/api/v1/segments/${survey._id}`)
            .send({
              surveyItems: [surveyItem2._id],
              answers: [{
                surveyItem: surveyItem1._id,
                questionItems: [questionItem11._id]
              }]
            })
            .expect(httpStatus.OK);

          const global = res.body.global[0].data;
          const segment = res.body.segment[0].data;

          expect(global.find(d => d._id === questionItem21._id.toString()).value).to.be.eq(2);
          expect(global.find(d => d._id === questionItem22._id.toString()).value).to.be.eq(0);
          expect(segment.find(d => d._id === questionItem21._id.toString()).value).to.be.eq(1);
          expect(segment.find(d => d._id === questionItem22._id.toString()).value).to.be.eq(0);
        });
      });

      describe('dropdown', () => {
        const fingerprintId1 = 'dropdown1';
        const fingerprintId2 = 'dropdown2';
        const fingerprintId3 = 'dropdown3';

        before(async () => {
          // create questions
          [
            question1,
            question2
          ] = await Promise.all([
            questionFactory({ type: 'dropdown' }),
            questionFactory({ type: 'dropdown' }),
          ]);

          // create surveyItems
          [
            surveyItem1,
            surveyItem2
          ] = await Promise.all([
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question1,
            }),
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question2,
            })
          ]);

          // create questionItems
          [
            questionItem11,
            questionItem12,
            questionItem21,
            questionItem22,
          ] = await Promise.all([
            questionItemFactory({ team, question: question1 }),
            questionItemFactory({ team, question: question1 }),
            questionItemFactory({ team, question: question2 }),
            questionItemFactory({ team, question: question2 })
          ]);

          // create survey results
          // first for filter matching
          // second from versus
          // third for testing summary versus
          await Promise.all([
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId1 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId2 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId3 })
          ]);

          // make three appropriate answers
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId1,
            answer: {
              [surveyItem1._id]: [questionItem11._id]
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId2,
            answer: {
              [surveyItem1._id]: [questionItem11._id],
              [surveyItem2._id]: [questionItem21._id]
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId3,
            answer: {
              [surveyItem1._id]: [questionItem12._id],
              [surveyItem2._id]: [questionItem21._id]
            }
          });
        });

        it('should return correct segments data', async () => {
          const res = await agent
            .post(`/api/v1/segments/${survey._id}`)
            .send({
              surveyItems: [surveyItem2._id],
              answers: [{
                surveyItem: surveyItem1._id,
                questionItems: [questionItem11._id]
              }]
            })
            .expect(httpStatus.OK);

          const global = res.body.global[0].data;
          const segment = res.body.segment[0].data;

          expect(global.find(d => d._id === questionItem21._id.toString()).value).to.be.eq(2);
          expect(global.find(d => d._id === questionItem22._id.toString()).value).to.be.eq(0);
          expect(segment.find(d => d._id === questionItem21._id.toString()).value).to.be.eq(1);
          expect(segment.find(d => d._id === questionItem22._id.toString()).value).to.be.eq(0);
        });
      });

      describe('linearScale', () => {
        const fingerprintId1 = 'linearScale1';
        const fingerprintId2 = 'linearScale2';
        const fingerprintId3 = 'linearScale3';

        before(async () => {
          // create questions
          [
            question1,
            question2
          ] = await Promise.all([
            questionFactory({ type: 'linearScale', from: 0, to: 10 }),
            questionFactory({ type: 'linearScale', from: 0, to: 10 }),
          ]);

          // create surveyItems
          [
            surveyItem1,
            surveyItem2
          ] = await Promise.all([
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question1,
            }),
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question2,
            })
          ]);

          // create survey results
          // first for filter matching
          // second from versus
          // third for testing summary versus
          await Promise.all([
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId1 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId2 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId3 })
          ]);

          // make three appropriate answers
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId1,
            answer: {
              [surveyItem1._id]: 5
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId2,
            answer: {
              [surveyItem1._id]: 5,
              [surveyItem2._id]: 10
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId3,
            answer: {
              [surveyItem1._id]: 10,
              [surveyItem2._id]: 10
            }
          });
        });

        it('should return correct segments data', async () => {
          const res = await agent
            .post(`/api/v1/segments/${survey._id}`)
            .send({
              surveyItems: [surveyItem2._id],
              answers: [{
                surveyItem: surveyItem1._id,
                value: '5'
              }]
            })
            .expect(httpStatus.OK);

          expect(res.body.global[0].data.find(d => d.name === '10').value).to.be.eq(2);
          expect(res.body.segment[0].data.find(d => d.name === '10').value).to.be.eq(1);
        });
      });

      describe('slider', () => {
        const fingerprintId1 = 'slider1';
        const fingerprintId2 = 'slider2';
        const fingerprintId3 = 'slider3';

        before(async () => {
          // create questions
          [
            question1,
            question2
          ] = await Promise.all([
            questionFactory({ type: 'slider', from: 0, to: 10 }),
            questionFactory({ type: 'slider', from: 0, to: 10 }),
          ]);

          // create surveyItems
          [
            surveyItem1,
            surveyItem2
          ] = await Promise.all([
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question1,
            }),
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question2,
            })
          ]);

          // create survey results
          // first for filter matching
          // second from versus
          // third for testing summary versus
          await Promise.all([
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId1 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId2 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId3 })
          ]);

          // make three appropriate answers
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId1,
            answer: {
              [surveyItem1._id]: 5
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId2,
            answer: {
              [surveyItem1._id]: 5,
              [surveyItem2._id]: 10
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId3,
            answer: {
              [surveyItem1._id]: 10,
              [surveyItem2._id]: 10
            }
          });
        });

        it('should return correct segments data', async () => {
          const res = await agent
            .post(`/api/v1/segments/${survey._id}`)
            .send({
              surveyItems: [surveyItem2._id],
              answers: [{
                surveyItem: surveyItem1._id,
                value: '5'
              }]
            })
            .expect(httpStatus.OK);

          expect(res.body.global[0].data.find(d => d.name === '10').value).to.be.eq(2);
          expect(res.body.segment[0].data.find(d => d.name === '10').value).to.be.eq(1);
        });
      });

      describe('netPromoterScore', () => {
        const fingerprintId1 = 'netPromoterScore1';
        const fingerprintId2 = 'netPromoterScore2';
        const fingerprintId3 = 'netPromoterScore3';

        before(async () => {
          // create questions
          [
            question1,
            question2
          ] = await Promise.all([
            questionFactory({ type: 'netPromoterScore' }),
            questionFactory({ type: 'netPromoterScore' }),
          ]);

          // create surveyItems
          [
            surveyItem1,
            surveyItem2
          ] = await Promise.all([
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question1,
            }),
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question2,
            })
          ]);

          // create survey results
          // first for filter matching
          // second from versus
          // third for testing summary versus
          await Promise.all([
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId1 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId2 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId3 })
          ]);

          // make three appropriate answers
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId1,
            answer: {
              [surveyItem1._id]: 5
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId2,
            answer: {
              [surveyItem1._id]: 5,
              [surveyItem2._id]: 10
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId3,
            answer: {
              [surveyItem1._id]: 10,
              [surveyItem2._id]: 10
            }
          });
        });

        it('should return correct segments data', async () => {
          const res = await agent
            .post(`/api/v1/segments/${survey._id}`)
            .send({
              surveyItems: [surveyItem2._id],
              answers: [{
                surveyItem: surveyItem1._id,
                value: '5'
              }]
            })
            .expect(httpStatus.OK);

          expect(res.body.global[0].data.find(d => d._id === 10).value).to.be.eq(2);
          expect(res.body.global[0].npsData.promoters).to.be.eq(2);
          expect(res.body.global[0].npsData.nps).to.be.eq(100);
          expect(res.body.segment[0].data.find(d => d._id === 10).value).to.be.eq(1);
          expect(res.body.segment[0].npsData.promoters).to.be.eq(1);
          expect(res.body.segment[0].npsData.nps).to.be.eq(100);
        });
      });

      describe('thumbs', () => {
        const fingerprintId1 = 'thumbs1';
        const fingerprintId2 = 'thumbs2';
        const fingerprintId3 = 'thumbs3';

        before(async () => {
          // create questions
          [
            question1,
            question2
          ] = await Promise.all([
            questionFactory({ type: 'thumbs' }),
            questionFactory({ type: 'thumbs' }),
          ]);

          // create surveyItems
          [
            surveyItem1,
            surveyItem2
          ] = await Promise.all([
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question1,
            }),
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question2,
            })
          ]);

          // create survey results
          // first for filter matching
          // second from versus
          // third for testing summary versus
          await Promise.all([
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId1 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId2 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId3 })
          ]);

          // make three appropriate answers
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId1,
            answer: {
              [surveyItem1._id]: 'yes'
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId2,
            answer: {
              [surveyItem1._id]: 'yes',
              [surveyItem2._id]: 'yes'
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId3,
            answer: {
              [surveyItem1._id]: 'no',
              [surveyItem2._id]: 'yes'
            }
          });
        });

        it('should return correct segments data', async () => {
          const res = await agent
            .post(`/api/v1/segments/${survey._id}`)
            .send({
              surveyItems: [surveyItem2._id],
              answers: [{
                surveyItem: surveyItem1._id,
                value: 'yes'
              }]
            })
            .expect(httpStatus.OK);

          expect(res.body.global[0].data.find(d => d._id === 0).value).to.be.eq(2);
          expect(res.body.segment[0].data.find(d => d._id === 0).value).to.be.eq(1);
        });
      });

      describe('multipleChoiceMatrix', () => {
        const fingerprintId1 = 'multipleChoiceMatrix1';
        const fingerprintId2 = 'multipleChoiceMatrix2';
        const fingerprintId3 = 'multipleChoiceMatrix3';

        before(async () => {
          // create questions
          [
            question1,
            question2
          ] = await Promise.all([
            questionFactory({ type: 'multipleChoiceMatrix' }),
            questionFactory({ type: 'multipleChoiceMatrix' }),
          ]);

          // create surveyItems
          [
            surveyItem1,
            surveyItem2
          ] = await Promise.all([
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question1,
            }),
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question2,
            })
          ]);

          // create rows and columns
          [
            row1,
            row2,
            column11,
            column12,
            column21
          ] = await Promise.all([
            gridRowFactory({ team, question: question1 }),
            gridRowFactory({ team, question: question2 }),
            gridColumnFactory({ team, question: question1 }),
            gridColumnFactory({ team, question: question1 }),
            gridColumnFactory({ team, question: question2 }),
            gridColumnFactory({ team, question: question2 })
          ]);

          // create survey results
          // first for filter matching
          // second from versus
          // third for testing summary versus
          await Promise.all([
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId1 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId2 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId3 })
          ]);

          // make three appropriate answers
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId1,
            answer: {
              [surveyItem1._id]: [{ row: row1._id, column: column11._id }]
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId2,
            answer: {
              [surveyItem1._id]: [{ row: row1._id, column: column11._id }],
              [surveyItem2._id]: [{ row: row2._id, column: column21._id }]
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId3,
            answer: {
              [surveyItem1._id]: [{ row: row1._id, column: column12._id }],
              [surveyItem2._id]: [{ row: row2._id, column: column21._id }]
            }
          });
        });

        it('should return correct segments data', async () => {
          const res = await agent
            .post(`/api/v1/segments/${survey._id}`)
            .send({
              surveyItems: [surveyItem2._id],
              answers: [{
                surveyItem: surveyItem1._id,
                gridRow: row1._id,
                gridColumn: column11._id,
              }]
            })
            .expect(httpStatus.OK);

          const global = res.body.global[0].data[0].items;
          const segment = res.body.segment[0].data[0].items;

          expect(global.find(d => d.columnId === column21._id.toString()).value).to.be.eq(2);
          expect(segment.find(d => d.columnId === column21._id.toString()).value).to.be.eq(1);
        });
      });

      describe('checkboxMatrix', () => {
        const fingerprintId1 = 'checkboxMatrix1';
        const fingerprintId2 = 'checkboxMatrix2';
        const fingerprintId3 = 'checkboxMatrix3';

        before(async () => {
          // create questions
          [
            question1,
            question2
          ] = await Promise.all([
            questionFactory({ type: 'checkboxMatrix' }),
            questionFactory({ type: 'checkboxMatrix' }),
          ]);

          // create surveyItems
          [
            surveyItem1,
            surveyItem2
          ] = await Promise.all([
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question1,
            }),
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question2,
            })
          ]);

          // create rows and columns
          [
            row1,
            row2,
            column11,
            column12,
            column21
          ] = await Promise.all([
            gridRowFactory({ team, question: question1 }),
            gridRowFactory({ team, question: question2 }),
            gridColumnFactory({ team, question: question1 }),
            gridColumnFactory({ team, question: question1 }),
            gridColumnFactory({ team, question: question2 }),
            gridColumnFactory({ team, question: question2 })
          ]);

          // create survey results
          // first for filter matching
          // second from versus
          // third for testing summary versus
          await Promise.all([
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId1 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId2 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId3 })
          ]);

          // make three appropriate answers
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId1,
            answer: {
              [surveyItem1._id]: [{ row: row1._id, column: column11._id }]
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId2,
            answer: {
              [surveyItem1._id]: [{ row: row1._id, column: column11._id }],
              [surveyItem2._id]: [{ row: row2._id, column: column21._id }]
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId3,
            answer: {
              [surveyItem1._id]: [{ row: row1._id, column: column12._id }],
              [surveyItem2._id]: [{ row: row2._id, column: column21._id }]
            }
          });
        });

        it('should return correct segments data', async () => {
          const res = await agent
            .post(`/api/v1/segments/${survey._id}`)
            .send({
              surveyItems: [surveyItem2._id],
              answers: [{
                surveyItem: surveyItem1._id,
                crossings: [{
                  gridRow: row1._id,
                  gridColumn: column11._id
                }]
              }]
            })
            .expect(httpStatus.OK);

          const global = res.body.global[0].data[0].items;
          const segment = res.body.segment[0].data[0].items;

          expect(global.find(d => d.columnId === column21._id.toString()).value).to.be.eq(2);
          expect(segment.find(d => d.columnId === column21._id.toString()).value).to.be.eq(1);
        });
      });

      describe('countryList', () => {
        const fingerprintId1 = 'countryList1';
        const fingerprintId2 = 'countryList2';
        const fingerprintId3 = 'countryList3';

        before(async () => {
          // create questions
          [
            question1,
            question2
          ] = await Promise.all([
            questionFactory({ type: 'countryList' }),
            questionFactory({ type: 'countryList' }),
          ]);

          // create surveyItems
          [
            surveyItem1,
            surveyItem2
          ] = await Promise.all([
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question1,
            }),
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question2,
            })
          ]);

          // create survey results
          // first for filter matching
          // second from versus
          // third for testing summary versus
          await Promise.all([
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId1 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId2 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId3 })
          ]);

          // make three appropriate answers
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId1,
            answer: {
              [surveyItem1._id]: country1._id.toString()
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId2,
            answer: {
              [surveyItem1._id]: country1._id.toString(),
              [surveyItem2._id]: country1._id.toString()
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId3,
            answer: {
              [surveyItem1._id]: country2._id.toString(),
              [surveyItem2._id]: country1._id.toString()
            }
          });
        });

        it('should return correct segments data', async () => {
          const res = await agent
            .post(`/api/v1/segments/${survey._id}`)
            .send({
              surveyItems: [surveyItem2._id],
              answers: [{
                surveyItem: surveyItem1._id,
                country: country1._id.toString()
              }]
            })
            .expect(httpStatus.OK);

          expect(res.body.global[0].data.find(d => d._id === country1._id.toString()).value)
            .to.be.eq(2);
          expect(res.body.segment[0].data.find(d => d._id === country1._id.toString()).value)
            .to.be.eq(1);
        });
      });

      describe('check filter range', () => {
        const fingerprintId1 = 'checkboxes11';
        const fingerprintId2 = 'checkboxes21';
        const fingerprintId3 = 'checkboxes31';
        const fingerprintId4 = 'checkboxes41';

        before(async () => {
          // create questions
          [
            question1,
            question2
          ] = await Promise.all([
            questionFactory({ type: 'checkboxes' }),
            questionFactory({ type: 'checkboxes' }),
          ]);

          // create surveyItems
          [
            surveyItem1,
            surveyItem2
          ] = await Promise.all([
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question1,
            }),
            surveyItemFactory({
              team,
              survey,
              surveySection,
              question: question2,
            })
          ]);

          // create questionItems
          [
            questionItem11,
            questionItem12,
            questionItem21,
            questionItem22,
          ] = await Promise.all([
            questionItemFactory({ team, question: question1 }),
            questionItemFactory({ team, question: question1 }),
            questionItemFactory({ team, question: question2 }),
            questionItemFactory({ team, question: question2 })
          ]);

          // create survey results
          // first for filter matching
          // second from versus
          // third for testing summary versus
          await Promise.all([
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId1 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId2 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId3 }),
            surveyResultFactory({ team, survey, contact, fingerprintId: fingerprintId4, createdAt: moment().subtract(1, 'day').toDate() })
          ]);

          // make three appropriate answers
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId1,
            answer: {
              [surveyItem1._id]: [questionItem11._id]
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId2,
            answer: {
              [surveyItem1._id]: [questionItem11._id],
              [surveyItem2._id]: [questionItem21._id]
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId3,
            answer: {
              [surveyItem1._id]: [questionItem12._id],
              [surveyItem2._id]: [questionItem21._id]
            }
          });
          await request(app).put('/api/v1/survey-answers').send({
            surveyId: survey,
            fingerprintId: fingerprintId4,
            answer: {
              [surveyItem1._id]: [questionItem11._id],
              [surveyItem2._id]: [questionItem21._id]
            }
          });
        });

        it('should return correct segments data', async () => {
          const res = await agent
            .post(`/api/v1/segments/${survey._id}`)
            .send({
              surveyItems: [surveyItem2._id],
              answers: [{
                surveyItem: surveyItem1._id,
                questionItems: [questionItem11._id]
              }],
              filters: {
                createdAt: {
                  from: new Date().toISOString(),
                  to: new Date().toISOString()
                }
              }
            })
            .expect(httpStatus.OK);

          const global = res.body.global[0].data;
          const segment = res.body.segment[0].data;

          expect(global.find(d => d._id === questionItem21._id.toString()).value).to.be.eq(2);
          expect(global.find(d => d._id === questionItem22._id.toString()).value).to.be.eq(0);
          expect(segment.find(d => d._id === questionItem21._id.toString()).value).to.be.eq(1);
          expect(segment.find(d => d._id === questionItem22._id.toString()).value).to.be.eq(0);
        });
      });
    });
  });
});
