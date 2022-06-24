import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import _ from 'lodash';
import async from 'async';
import app from '../../..';

// helpers
import cleanData from '../testHelpers/cleanData';

// models
import {
  QuestionStatistic,
  SurveyResult
} from '../../models';

// factories
import {
  companyFactory,
  gridRowFactory,
  questionFactory,
  questionItemFactory,
  surveyFactory,
  surveyItemFactory,
  surveyResultFactory,
  surveySectionFactory,
  teamFactory,
  gridColumnFactory
} from '../factories';

// cron
import recountQuestionStatistic from '../../cron/recountQuestionStatistic';

chai.config.includeStack = true;

let company;
let team;
let survey;
let surveySection;
let multipleChoice;
let checkboxes;
let dropdown;
let linearScale;
let thumbs;
let netPromoterScore;
let slider;
let multipleChoiceMatrix;
let checkboxMatrix;
let multipleChoiceItem;
let checkboxesItem;
let dropdownItem;
let linearScaleItem;
let thumbsItem;
let netPromoterScoreItem;
let sliderItem;
let multipleChoiceMatrixItem;
let checkboxMatrixItem;
let questionItem1;
let questionItem2;
let questionItem3;
let row1;
let row2;
let column1;
let column2;
let answer;

const fingerprintId = 'fingerprintId';

async function makeTestData() {
  // create company and team
  company = await companyFactory({});
  team = await teamFactory({ company: company._id });
  // create survey
  survey = await surveyFactory({ team, publicAccess: true });
  survey = survey._id;
  // create surveySection
  surveySection = await surveySectionFactory({ team, survey: survey._id });
  surveySection = surveySection._id;
  // create few questions
  [
    multipleChoice,
    checkboxes,
    dropdown,
    linearScale,
    thumbs,
    netPromoterScore,
    slider,
    multipleChoiceMatrix,
    checkboxMatrix
  ] = await Promise.all([
    questionFactory({ team, type: 'multipleChoice' }),
    questionFactory({ team, type: 'checkboxes' }),
    questionFactory({ team, type: 'dropdown' }),
    questionFactory({ team, type: 'linearScale' }),
    questionFactory({ team, type: 'thumbs' }),
    questionFactory({ team, type: 'netPromoterScore' }),
    questionFactory({ team, type: 'slider' }),
    questionFactory({ team, type: 'multipleChoiceMatrix' }),
    questionFactory({ team, type: 'checkboxMatrix' })
  ]);
  // create questionItems
  [
    questionItem1,
    questionItem2,
    questionItem3
  ] = await Promise.all([
    questionItemFactory({ team, question: multipleChoice._id }),
    questionItemFactory({ team, question: checkboxes._id }),
    questionItemFactory({ team, question: dropdown._id })
  ]);
  // create gridRows and gridColumns
  [
    row1,
    row2,
    column1,
    column2
  ] = await Promise.all([
    gridRowFactory({ team, question: multipleChoiceMatrix._id }),
    gridRowFactory({ team, question: checkboxMatrix._id }),
    gridColumnFactory({ team, question: multipleChoiceMatrix._id }),
    gridColumnFactory({ team, question: checkboxMatrix._id }),
  ]);
  // create surveyItems
  [
    multipleChoiceItem,
    checkboxesItem,
    dropdownItem,
    linearScaleItem,
    thumbsItem,
    netPromoterScoreItem,
    sliderItem,
    multipleChoiceMatrixItem,
    checkboxMatrixItem
  ] = await Promise.all([
    surveyItemFactory({ team, survey, question: multipleChoice._id, surveySection }),
    surveyItemFactory({ team, survey, question: checkboxes._id, surveySection }),
    surveyItemFactory({ team, survey, question: dropdown._id, surveySection }),
    surveyItemFactory({ team, survey, question: linearScale._id, surveySection }),
    surveyItemFactory({ team, survey, question: thumbs._id, surveySection }),
    surveyItemFactory({ team, survey, question: netPromoterScore._id, surveySection }),
    surveyItemFactory({ team, survey, question: slider._id, surveySection }),
    surveyItemFactory({ team, survey, question: multipleChoiceMatrix._id, surveySection }),
    surveyItemFactory({ team, survey, question: checkboxMatrix._id, surveySection }),
  ]);
  // create surveyResult
  await surveyResultFactory({ team, survey, fingerprintId, completed: false });
  // make answer body
  answer = {
    [multipleChoiceItem._id]: [questionItem1._id],
    [checkboxesItem._id]: [questionItem2._id],
    [dropdownItem._id]: [questionItem3._id],
    [linearScaleItem._id]: 50,
    [thumbsItem._id]: 'yes',
    [netPromoterScoreItem._id]: 9,
    [sliderItem._id]: 10,
    [multipleChoiceMatrixItem._id]: [{ row: row1._id, column: column1._id }],
    [checkboxMatrixItem._id]: [{ row: row2._id, column: column2._id }]
  };
}

describe('## recountQuestionStatistic()', () => {
  before(cleanData);

  before(makeTestData);

  describe('should recount statistic', () => {
    let beforeRecountEntities;
    let afterRecountEntities;
    let equality;

    before(async () => {
      const time = new Date(new Date().setMinutes(0, 0, 0)).toISOString();
      // remove questionStatistic entities
      await QuestionStatistic.model.remove({ time });
      // make answers
      await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer,
          fingerprintId,
          surveyId: survey
        })
        .expect(httpStatus.OK);
      // get entities
      beforeRecountEntities = await QuestionStatistic.model.find();
      // run recount
      await recountQuestionStatistic();
      // get entities
      afterRecountEntities = await QuestionStatistic.model.find();
    });

    it('should recount incorrect data', async () => {
      // broke correct data
      await async.eachLimit(afterRecountEntities, 5, (after, cb) => {
        // broke data
        after.data = Object.keys(after.data).reduce((acc, key) => {
          acc[key] = parseInt((Math.random() * 10) + 10, 10);
          return acc;
        }, {});
        after.markModified('data');
        after.syncDB = false;
        after.save()
          .then(() => cb())
          .catch(cb);
      });
      // check equality
      equality = beforeRecountEntities.every((before) => {
        const after = afterRecountEntities.find(e => e._id.toString() === before._id.toString());
        return _.isEqual(before.data, after.data);
      });
      // expect
      expect(equality).to.be.eq(false);
      // run recount
      await recountQuestionStatistic();
      // reload entities
      const reload = await QuestionStatistic.model.find().lean();
      // check equality after recount
      equality = beforeRecountEntities.every((before) => {
        const after = reload.find(e => e._id.toString() === before._id.toString());
        const beforeData = Object.keys(before.data).reduce((acc, key) => {
          acc[key] = parseInt(before.data[key], 10);
          return acc;
        }, {});
        return _.isEqual(beforeData, after.data);
      });
      // expect
      expect(equality).to.be.eq(true);
    });

    it('should recount answered skipped and skipped by flow counters', async () => {
      const time = new Date(new Date().setMinutes(0, 0, 0)).toISOString();
      // remove questionStatistic and surveyResult
      await Promise.all([
        QuestionStatistic.model.remove({ time }),
        SurveyResult.model.remove({ survey })
      ]);
      // crete answer with skipped surveyItems
      const answer = {
        [multipleChoiceItem._id]: [questionItem1._id],
        [checkboxesItem._id]: [questionItem2._id],
        [dropdownItem._id]: [questionItem3._id],
        [linearScaleItem._id]: 50,
        [thumbsItem._id]: 'yes'
      };
      // create survey results
      await surveyResultFactory({ team, survey, fingerprintId });
      // make answers
      await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer,
          fingerprintId,
          surveyId: survey._id
        })
        .expect(httpStatus.OK);
      // run recount
      await recountQuestionStatistic();
      // get statistic
      const [
        answered,
        skipped
      ] = await Promise.all([
        QuestionStatistic.model
          .find({ surveyItem: Object.keys(answer), time })
          .lean(),
        QuestionStatistic.model
          .find({ surveyItem: { $nin: Object.keys(answer) }, time })
          .lean()
      ]);

      expect(answered.every(s => s.answered === 1 && s.skipped === 0)).to.be.eq(true);
      expect(skipped.every(s => s.answered === 0 && s.skipped === 1)).to.be.eq(true);
    });
  });
});
