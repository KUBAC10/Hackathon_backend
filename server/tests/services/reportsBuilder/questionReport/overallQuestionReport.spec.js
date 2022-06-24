import chai, { expect } from 'chai';
import app from 'index'; // eslint-disable-line
import config from 'config/env';
import moment from 'moment';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// service
import overallQuestionReport from 'server/services/reportsBuilder/helpers/overallQuestionReport';

// factories
import {
  companyFactory,
  teamFactory,
  surveyFactory,
  gridRowFactory,
  questionFactory,
  gridColumnFactory,
  surveyItemFactory,
  surveyResultFactory,
  questionItemFactory,
  surveySectionFactory,
  questionStatisticFactory,
  countryFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

const timeZone = config.timezone;

let company;
let team;
let survey;
let surveySection;
let surveyItem;
let question;
let data;
let questionItemIds = [];
let rowIds;
let columnIds;
let country1;
let country2;
let country3;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });
  survey = await surveyFactory({ team });
  surveySection = await surveySectionFactory({ team, survey });
  [
    country1,
    country2,
    country3,
  ] = await Promise.all([
    countryFactory({}),
    countryFactory({}),
    countryFactory({}),
  ]);
}

describe('overallQuestionReport', () => {
  before(cleanData);

  before(makeTestData);

  describe('Text', () => {
    before(async () => {
      const value = 'text text text text text text text text text text question question question question question';
      question = await questionFactory({ team });
      surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
      await Promise.all([
        surveyResultFactory({ team, survey, answer: { [surveyItem._id]: { value } } }),
        surveyResultFactory({ team, survey, answer: { [surveyItem._id]: { value } } }),
        surveyResultFactory({ team, survey, answer: { [surveyItem._id]: { value } } }),
      ]);
    });

    it('should return correct data', async () => {
      const res = await overallQuestionReport({ surveyItem, question, timeZone });
      // expect structure
      expect(res).to.be.an('object');
      expect(res.question).to.be.an('object');
      expect(res.question.name).to.be.an('object');
      expect(res.question._id).to.be.eq(question._id);
      expect(res.question.type).to.be.eq(question.type);
      expect(res.question.name.en).to.be.eq(question.name.en);
      expect(res.question.surveyItem).to.be.eq(surveyItem._id);
      expect(res.data).to.be.an('array');
      expect(res.prevData).to.be.an('array');
      // expect data
      expect(res.data.length).to.be.eq(2);
      expect(res.data[0]).to.be.deep.equal({ text: 'text', value: 30 });
      expect(res.data[1]).to.be.deep.equal({ text: 'question', value: 15 });
      // expect prev data
      expect(res.prevData.length).to.be.eq(0);
    });
  });

  describe('Split by hours', () => {
    describe('Checkboxes', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'checkboxes' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.questionItems = await Promise.all([
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
        ]);
        questionItemIds = question.questionItems.map(q => q._id.toString());
        data = question.questionItems.reduce((acc, i) => ({ ...acc, [i._id]: 1 }), {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(1) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(2) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(24);
        const current = res.data.find(d => d.date === moment().format('YYYY-MM-DD HH')).items;
        expect(current.every(d => d.value === 2)).to.be.eq(true);
        expect(current.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('MultipleChoice', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'multipleChoice' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.questionItems = await Promise.all([
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
        ]);
        questionItemIds = question.questionItems.map(q => q._id.toString());
        data = question.questionItems.reduce((acc, i) => ({ ...acc, [i._id]: 1 }), {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(1) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(2) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(24);
        const current = res.data.find(d => d.date === moment().format('YYYY-MM-DD HH')).items;
        expect(current.every(d => d.value === 2)).to.be.eq(true);
        expect(current.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('Dropdown', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'dropdown' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.questionItems = await Promise.all([
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
        ]);
        questionItemIds = question.questionItems.map(q => q._id.toString());
        data = question.questionItems.reduce((acc, i) => ({ ...acc, [i._id]: 1 }), {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(1) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(2) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(24);
        const current = res.data.find(d => d.date === moment().format('YYYY-MM-DD HH')).items;
        expect(current.every(d => d.value === 2)).to.be.eq(true);
        expect(current.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('Slider', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'slider', from: 1, to: 100 });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = { 1: 1, 2: 1, 3: 1 };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(1) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(2) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.find(d => d.date === moment().format('YYYY-MM-DD HH'))).to.be.deep
          .eq({ date: moment().format('YYYY-MM-DD HH'), value: 2 });
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('LinearScale', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'linearScale', from: 1, to: 10 });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = { 1: 1, 2: 1, 3: 1 };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(1) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(2) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.find(d => d.date === moment().format('YYYY-MM-DD HH'))).to.be.deep
          .eq({ date: moment().format('YYYY-MM-DD HH'), value: 2 });
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('NetPromoterScore', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'netPromoterScore' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = { 1: 1, 2: 1, 3: 1 };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(1) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(2) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.filter(d => [1, 2, 3].includes(d._id))
          .every(d => d.value === 2)).to.be.eq(true);
        expect(res.data.filter(d => ![1, 2, 3].includes(d._id))
          .every(d => d.value === 0)).to.be.eq(true);
        expect(res.npsData).to.be.deep.eq({ detractors: 6, passives: 0, promoters: 0, nps: -100 });
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('CheckboxMatrix', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'checkboxMatrix' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.gridRows = await Promise.all([
          gridRowFactory({ team, question }),
          gridRowFactory({ team, question }),
          gridRowFactory({ team, question }),
        ]);
        rowIds = question.gridRows.map(r => r._id.toString());
        question.gridColumns = await Promise.all([
          gridColumnFactory({ team, question }),
          gridColumnFactory({ team, question }),
          gridColumnFactory({ team, question })
        ]);
        columnIds = question.gridColumns.map(c => c._id.toString());
        data = question.gridRows.reduce((acc, row, i) => {
          acc[`${row._id}#${question.gridColumns[i]._id}`] = 1;
          return acc;
        }, {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(1) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(2) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.every(d => rowIds.includes(d._id.toString()))).to.be.eq(true);
        expect(res.data.flatMap(d => d.items).every(i => (
          rowIds.includes(i.rowId.toString()) &&
          columnIds.includes(i.columnId.toString()) &&
          columnIds.includes(i._id.toString()) &&
          i.score === 0 &&
          [0, 2].includes(i.value))
        )).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('MultipleChoiceMatrix', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'multipleChoiceMatrix' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.gridRows = await Promise.all([
          gridRowFactory({ team, question }),
          gridRowFactory({ team, question }),
          gridRowFactory({ team, question }),
        ]);
        rowIds = question.gridRows.map(r => r._id.toString());
        question.gridColumns = await Promise.all([
          gridColumnFactory({ team, question }),
          gridColumnFactory({ team, question }),
          gridColumnFactory({ team, question })
        ]);
        columnIds = question.gridColumns.map(c => c._id.toString());
        data = question.gridRows.reduce((acc, row, i) => {
          acc[`${row._id}#${question.gridColumns[i]._id}`] = 1;
          return acc;
        }, {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(1) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(2) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.every(d => rowIds.includes(d._id.toString()))).to.be.eq(true);
        expect(res.data.flatMap(d => d.items).every(i => (
          rowIds.includes(i.rowId.toString()) &&
          columnIds.includes(i.columnId.toString()) &&
          columnIds.includes(i._id.toString()) &&
          i.score === 0 &&
          [0, 2].includes(i.value))
        )).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('Thumbs', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'thumbs' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = { yes: 1, no: 1 };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(1) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(2) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(24);
        const current = res.data.find(d => d.date === moment().format('YYYY-MM-DD HH'));
        expect(current.items[0]._id).to.be.eq(0);
        expect(current.items[0].name).to.be.eq('yes');
        expect(current.items[0].value).to.be.eq(2);
        expect(current.items[1]._id).to.be.eq(1);
        expect(current.items[1].name).to.be.eq('no');
        expect(current.items[1].value).to.be.eq(2);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('Country List', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'countryList' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = {
          [country1._id]: 2,
          [country2._id]: 5,
          [country3._id]: 9,
        };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(1) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date().setSeconds(2) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.find(d => d._id.toString() === country1._id.toString()).value)
          .to.be.eq(4);
        expect(res.data.find(d => d._id.toString() === country2._id.toString()).value)
          .to.be.eq(10);
        expect(res.data.find(d => d._id.toString() === country3._id.toString()).value)
          .to.be.eq(18);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });
  });

  describe('Split by days', () => {
    const range = {
      from: moment().subtract(5, 'days').startOf('day').toISOString(),
      to: moment().endOf('day').toISOString()
    };

    describe('Checkboxes', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'checkboxes' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.questionItems = await Promise.all([
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
        ]);
        questionItemIds = question.questionItems.map(q => q._id.toString());
        data = question.questionItems.reduce((acc, i) => ({ ...acc, [i._id]: 1 }), {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(6);
        const last = res.data.find(d => d.date.to.toISOString() === range.to).items;
        expect(last.every(d => d.value === 1)).to.be.eq(true);
        expect(last.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        const first = res.data.find(d => d.date.from.toISOString() === range.from).items;
        expect(first.every(d => d.value === 1)).to.be.eq(true);
        expect(first.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('MultipleChoice', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'multipleChoice' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.questionItems = await Promise.all([
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
        ]);
        questionItemIds = question.questionItems.map(q => q._id.toString());
        data = question.questionItems.reduce((acc, i) => ({ ...acc, [i._id]: 1 }), {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(6);
        const last = res.data.find(d => d.date.to.toISOString() === range.to).items;
        expect(last.every(d => d.value === 1)).to.be.eq(true);
        expect(last.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        const first = res.data.find(d => d.date.from.toISOString() === range.from).items;
        expect(first.every(d => d.value === 1)).to.be.eq(true);
        expect(first.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('Dropdown', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'dropdown' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.questionItems = await Promise.all([
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
        ]);
        questionItemIds = question.questionItems.map(q => q._id.toString());
        data = question.questionItems.reduce((acc, i) => ({ ...acc, [i._id]: 1 }), {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(6);
        const last = res.data.find(d => d.date.to.toISOString() === range.to).items;
        expect(last.every(d => d.value === 1)).to.be.eq(true);
        expect(last.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        const first = res.data.find(d => d.date.from.toISOString() === range.from).items;
        expect(first.every(d => d.value === 1)).to.be.eq(true);
        expect(first.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('Slider', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'slider', from: 1, to: 100 });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = { 1: 1, 2: 1, 3: 1 };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(6);
        expect(res.data.find(d => d.date.to.toISOString() === range.to).value).to.be.eq(2);
        expect(res.data.find(d => d.date.from.toISOString() === range.from).value).to.be.eq(2);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('LinearScale', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'linearScale', from: 1, to: 10 });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = { 1: 1, 2: 1, 3: 1 };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(6);
        expect(res.data.find(d => d.date.to.toISOString() === range.to).value).to.be.eq(2);
        expect(res.data.find(d => d.date.from.toISOString() === range.from).value).to.be.eq(2);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('NetPromoterScore', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'netPromoterScore' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = { 1: 1, 2: 1, 3: 1 };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.filter(d => [1, 2, 3].includes(d._id))
          .every(d => d.value === 2)).to.be.eq(true);
        expect(res.data.filter(d => ![1, 2, 3].includes(d._id))
          .every(d => d.value === 0)).to.be.eq(true);
        expect(res.npsData).to.be.deep.eq({ detractors: 6, passives: 0, promoters: 0, nps: -100 });
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('CheckboxMatrix', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'checkboxMatrix' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.gridRows = await Promise.all([
          gridRowFactory({ team, question }),
          gridRowFactory({ team, question }),
          gridRowFactory({ team, question }),
        ]);
        rowIds = question.gridRows.map(r => r._id.toString());
        question.gridColumns = await Promise.all([
          gridColumnFactory({ team, question }),
          gridColumnFactory({ team, question }),
          gridColumnFactory({ team, question })
        ]);
        columnIds = question.gridColumns.map(c => c._id.toString());
        data = question.gridRows.reduce((acc, row, i) => {
          acc[`${row._id}#${question.gridColumns[i]._id}`] = 1;
          return acc;
        }, {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.every(d => rowIds.includes(d._id.toString()))).to.be.eq(true);
        expect(res.data.flatMap(d => d.items).every(i => (
          rowIds.includes(i.rowId.toString()) &&
          columnIds.includes(i.columnId.toString()) &&
          columnIds.includes(i._id.toString()) &&
          i.score === 0 &&
          [0, 2].includes(i.value))
        )).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('MultipleChoiceMatrix', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'multipleChoiceMatrix' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.gridRows = await Promise.all([
          gridRowFactory({ team, question }),
          gridRowFactory({ team, question }),
          gridRowFactory({ team, question }),
        ]);
        rowIds = question.gridRows.map(r => r._id.toString());
        question.gridColumns = await Promise.all([
          gridColumnFactory({ team, question }),
          gridColumnFactory({ team, question }),
          gridColumnFactory({ team, question })
        ]);
        columnIds = question.gridColumns.map(c => c._id.toString());
        data = question.gridRows.reduce((acc, row, i) => {
          acc[`${row._id}#${question.gridColumns[i]._id}`] = 1;
          return acc;
        }, {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.every(d => rowIds.includes(d._id.toString()))).to.be.eq(true);
        expect(res.data.flatMap(d => d.items).every(i => (
          rowIds.includes(i.rowId.toString()) &&
          columnIds.includes(i.columnId.toString()) &&
          columnIds.includes(i._id.toString()) &&
          i.score === 0 &&
          [0, 2].includes(i.value))
        )).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('Thumbs', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'thumbs' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = { yes: 1, no: 1 };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(6);

        const first = res.data.find(d => d.date.to.toISOString() === range.to);

        expect(first.items[0]._id).to.be.eq(0);
        expect(first.items[0].name).to.be.eq('yes');
        expect(first.items[0].value).to.be.eq(1);
        expect(first.items[1]._id).to.be.eq(1);
        expect(first.items[1].name).to.be.eq('no');
        expect(first.items[1].value).to.be.eq(1);

        const last = res.data.find(d => d.date.from.toISOString() === range.from);

        expect(last.items[0]._id).to.be.eq(0);
        expect(last.items[0].name).to.be.eq('yes');
        expect(last.items[0].value).to.be.eq(1);
        expect(last.items[1]._id).to.be.eq(1);
        expect(last.items[1].name).to.be.eq('no');
        expect(last.items[1].value).to.be.eq(1);


        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('Country List', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'countryList' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = {
          [country1._id]: 2,
          [country2._id]: 5,
          [country3._id]: 9,
        };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.find(d => d._id.toString() === country1._id.toString()).value)
          .to.be.eq(4);
        expect(res.data.find(d => d._id.toString() === country2._id.toString()).value)
          .to.be.eq(10);
        expect(res.data.find(d => d._id.toString() === country3._id.toString()).value)
          .to.be.eq(18);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });
  });

  describe('Split by weeks', () => {
    const range = {
      from: moment().subtract(5, 'weeks').startOf('day').toISOString(),
      to: moment().endOf('day').toISOString()
    };

    describe('Checkboxes', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'checkboxes' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.questionItems = await Promise.all([
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
        ]);
        questionItemIds = question.questionItems.map(q => q._id.toString());
        data = question.questionItems.reduce((acc, i) => ({ ...acc, [i._id]: 1 }), {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(6);
        const last = res.data.find(d => d.date.to.toISOString() === range.to).items;
        expect(last.every(d => d.value === 1)).to.be.eq(true);
        expect(last.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        const first = res.data.find(d => d.date.from.toISOString() === range.from).items;
        expect(first.every(d => d.value === 1)).to.be.eq(true);
        expect(first.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('MultipleChoice', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'multipleChoice' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.questionItems = await Promise.all([
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
        ]);
        questionItemIds = question.questionItems.map(q => q._id.toString());
        data = question.questionItems.reduce((acc, i) => ({ ...acc, [i._id]: 1 }), {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(6);
        const last = res.data.find(d => d.date.to.toISOString() === range.to).items;
        expect(last.every(d => d.value === 1)).to.be.eq(true);
        expect(last.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        const first = res.data.find(d => d.date.from.toISOString() === range.from).items;
        expect(first.every(d => d.value === 1)).to.be.eq(true);
        expect(first.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('Dropdown', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'dropdown' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.questionItems = await Promise.all([
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
        ]);
        questionItemIds = question.questionItems.map(q => q._id.toString());
        data = question.questionItems.reduce((acc, i) => ({ ...acc, [i._id]: 1 }), {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(6);
        const last = res.data.find(d => d.date.to.toISOString() === range.to).items;
        expect(last.every(d => d.value === 1)).to.be.eq(true);
        expect(last.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        const first = res.data.find(d => d.date.from.toISOString() === range.from).items;
        expect(first.every(d => d.value === 1)).to.be.eq(true);
        expect(first.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('Slider', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'slider', from: 1, to: 100 });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = { 1: 1, 2: 1, 3: 1 };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(6);
        expect(res.data.find(d => d.date.to.toISOString() === range.to).value).to.be.eq(2);
        expect(res.data.find(d => d.date.from.toISOString() === range.from).value).to.be.eq(2);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('LinearScale', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'linearScale', from: 1, to: 10 });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = { 1: 1, 2: 1, 3: 1 };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(6);
        expect(res.data.find(d => d.date.to.toISOString() === range.to).value).to.be.eq(2);
        expect(res.data.find(d => d.date.from.toISOString() === range.from).value).to.be.eq(2);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('NetPromoterScore', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'netPromoterScore' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = { 1: 1, 2: 1, 3: 1 };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.filter(d => [1, 2, 3].includes(d._id))
          .every(d => d.value === 2)).to.be.eq(true);
        expect(res.data.filter(d => ![1, 2, 3].includes(d._id))
          .every(d => d.value === 0)).to.be.eq(true);
        expect(res.npsData).to.be.deep.eq({ detractors: 6, passives: 0, promoters: 0, nps: -100 });
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('CheckboxMatrix', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'checkboxMatrix' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.gridRows = await Promise.all([
          gridRowFactory({ team, question }),
          gridRowFactory({ team, question }),
          gridRowFactory({ team, question }),
        ]);
        rowIds = question.gridRows.map(r => r._id.toString());
        question.gridColumns = await Promise.all([
          gridColumnFactory({ team, question }),
          gridColumnFactory({ team, question }),
          gridColumnFactory({ team, question })
        ]);
        columnIds = question.gridColumns.map(c => c._id.toString());
        data = question.gridRows.reduce((acc, row, i) => {
          acc[`${row._id}#${question.gridColumns[i]._id}`] = 1;
          return acc;
        }, {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.every(d => rowIds.includes(d._id.toString()))).to.be.eq(true);
        expect(res.data.flatMap(d => d.items).every(i => (
          rowIds.includes(i.rowId.toString()) &&
          columnIds.includes(i.columnId.toString()) &&
          columnIds.includes(i._id.toString()) &&
          i.score === 0 &&
          [0, 2].includes(i.value))
        )).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('MultipleChoiceMatrix', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'multipleChoiceMatrix' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.gridRows = await Promise.all([
          gridRowFactory({ team, question }),
          gridRowFactory({ team, question }),
          gridRowFactory({ team, question }),
        ]);
        rowIds = question.gridRows.map(r => r._id.toString());
        question.gridColumns = await Promise.all([
          gridColumnFactory({ team, question }),
          gridColumnFactory({ team, question }),
          gridColumnFactory({ team, question })
        ]);
        columnIds = question.gridColumns.map(c => c._id.toString());
        data = question.gridRows.reduce((acc, row, i) => {
          acc[`${row._id}#${question.gridColumns[i]._id}`] = 1;
          return acc;
        }, {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.every(d => rowIds.includes(d._id.toString()))).to.be.eq(true);
        expect(res.data.flatMap(d => d.items).every(i => (
          rowIds.includes(i.rowId.toString()) &&
          columnIds.includes(i.columnId.toString()) &&
          columnIds.includes(i._id.toString()) &&
          i.score === 0 &&
          [0, 2].includes(i.value))
        )).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('Thumbs', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'thumbs' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = { yes: 1, no: 1 };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(6);
        const first = res.data.find(d => d.date.to.toISOString() === range.to);
        expect(first.items[0]._id).to.be.eq(0);
        expect(first.items[0].name).to.be.eq('yes');
        expect(first.items[0].value).to.be.eq(1);
        expect(first.items[1]._id).to.be.eq(1);
        expect(first.items[1].name).to.be.eq('no');
        expect(first.items[1].value).to.be.eq(1);
        const last = res.data.find(d => d.date.from.toISOString() === range.from);
        expect(last.items[0]._id).to.be.eq(0);
        expect(last.items[0].name).to.be.eq('yes');
        expect(last.items[0].value).to.be.eq(1);
        expect(last.items[1]._id).to.be.eq(1);
        expect(last.items[1].name).to.be.eq('no');
        expect(last.items[1].value).to.be.eq(1);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('Country List', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'countryList' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = {
          [country1._id]: 2,
          [country2._id]: 5,
          [country3._id]: 9,
        };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.find(d => d._id.toString() === country1._id.toString()).value)
          .to.be.eq(4);
        expect(res.data.find(d => d._id.toString() === country2._id.toString()).value)
          .to.be.eq(10);
        expect(res.data.find(d => d._id.toString() === country3._id.toString()).value)
          .to.be.eq(18);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });
  });

  describe('Split by months', () => {
    const range = {
      from: moment().subtract(5, 'months').startOf('day').toISOString(),
      to: moment().endOf('day').toISOString()
    };

    describe('Checkboxes', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'checkboxes' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.questionItems = await Promise.all([
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
        ]);
        questionItemIds = question.questionItems.map(q => q._id.toString());
        data = question.questionItems.reduce((acc, i) => ({ ...acc, [i._id]: 1 }), {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(6);
        const last = res.data.find(d => d.date.to.toISOString() === range.to).items;
        expect(last.every(d => d.value === 1)).to.be.eq(true);
        expect(last.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        const first = res.data.find(d => d.date.from.toISOString() === range.from).items;
        expect(first.every(d => d.value === 1)).to.be.eq(true);
        expect(first.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('MultipleChoice', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'multipleChoice' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.questionItems = await Promise.all([
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
        ]);
        questionItemIds = question.questionItems.map(q => q._id.toString());
        data = question.questionItems.reduce((acc, i) => ({ ...acc, [i._id]: 1 }), {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(6);
        const last = res.data.find(d => d.date.to.toISOString() === range.to).items;
        expect(last.every(d => d.value === 1)).to.be.eq(true);
        expect(last.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        const first = res.data.find(d => d.date.from.toISOString() === range.from).items;
        expect(first.every(d => d.value === 1)).to.be.eq(true);
        expect(first.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('Dropdown', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'dropdown' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.questionItems = await Promise.all([
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
          questionItemFactory({ team, question }),
        ]);
        questionItemIds = question.questionItems.map(q => q._id.toString());
        data = question.questionItems.reduce((acc, i) => ({ ...acc, [i._id]: 1 }), {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(6);
        const last = res.data.find(d => d.date.to.toISOString() === range.to).items;
        expect(last.every(d => d.value === 1)).to.be.eq(true);
        expect(last.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        const first = res.data.find(d => d.date.from.toISOString() === range.from).items;
        expect(first.every(d => d.value === 1)).to.be.eq(true);
        expect(first.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('Slider', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'slider', from: 1, to: 100 });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = { 1: 1, 2: 1, 3: 1 };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(6);
        expect(res.data.find(d => d.date.to.toISOString() === range.to).value).to.be.eq(2);
        expect(res.data.find(d => d.date.from.toISOString() === range.from).value).to.be.eq(2);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('LinearScale', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'linearScale', from: 1, to: 10 });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = { 1: 1, 2: 1, 3: 1 };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(6);
        expect(res.data.find(d => d.date.to.toISOString() === range.to).value).to.be.eq(2);
        expect(res.data.find(d => d.date.from.toISOString() === range.from).value).to.be.eq(2);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('NetPromoterScore', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'netPromoterScore' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = { 1: 1, 2: 1, 3: 1 };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.filter(d => [1, 2, 3].includes(d._id))
          .every(d => d.value === 2)).to.be.eq(true);
        expect(res.data.filter(d => ![1, 2, 3].includes(d._id))
          .every(d => d.value === 0)).to.be.eq(true);
        expect(res.npsData).to.be.deep.eq({ detractors: 6, passives: 0, promoters: 0, nps: -100 });
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('CheckboxMatrix', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'checkboxMatrix' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.gridRows = await Promise.all([
          gridRowFactory({ team, question }),
          gridRowFactory({ team, question }),
          gridRowFactory({ team, question }),
        ]);
        rowIds = question.gridRows.map(r => r._id.toString());
        question.gridColumns = await Promise.all([
          gridColumnFactory({ team, question }),
          gridColumnFactory({ team, question }),
          gridColumnFactory({ team, question })
        ]);
        columnIds = question.gridColumns.map(c => c._id.toString());
        data = question.gridRows.reduce((acc, row, i) => {
          acc[`${row._id}#${question.gridColumns[i]._id}`] = 1;
          return acc;
        }, {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.every(d => rowIds.includes(d._id.toString()))).to.be.eq(true);
        expect(res.data.flatMap(d => d.items).every(i => (
          rowIds.includes(i.rowId.toString()) &&
          columnIds.includes(i.columnId.toString()) &&
          columnIds.includes(i._id.toString()) &&
          i.score === 0 &&
          [0, 2].includes(i.value))
        )).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('MultipleChoiceMatrix', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'multipleChoiceMatrix' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        question.gridRows = await Promise.all([
          gridRowFactory({ team, question }),
          gridRowFactory({ team, question }),
          gridRowFactory({ team, question }),
        ]);
        rowIds = question.gridRows.map(r => r._id.toString());
        question.gridColumns = await Promise.all([
          gridColumnFactory({ team, question }),
          gridColumnFactory({ team, question }),
          gridColumnFactory({ team, question })
        ]);
        columnIds = question.gridColumns.map(c => c._id.toString());
        data = question.gridRows.reduce((acc, row, i) => {
          acc[`${row._id}#${question.gridColumns[i]._id}`] = 1;
          return acc;
        }, {});
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.every(d => rowIds.includes(d._id.toString()))).to.be.eq(true);
        expect(res.data.flatMap(d => d.items).every(i => (
          rowIds.includes(i.rowId.toString()) &&
          columnIds.includes(i.columnId.toString()) &&
          columnIds.includes(i._id.toString()) &&
          i.score === 0 &&
          [0, 2].includes(i.value))
        )).to.be.eq(true);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('Thumbs', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'thumbs' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = { yes: 1, no: 1 };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.length).to.be.eq(6);
        const first = res.data.find(d => d.date.to.toISOString() === range.to);
        expect(first.items[0]._id).to.be.eq(0);
        expect(first.items[0].name).to.be.eq('yes');
        expect(first.items[0].value).to.be.eq(1);
        expect(first.items[1]._id).to.be.eq(1);
        expect(first.items[1].name).to.be.eq('no');
        expect(first.items[1].value).to.be.eq(1);
        const last = res.data.find(d => d.date.from.toISOString() === range.from);
        expect(last.items[0]._id).to.be.eq(0);
        expect(last.items[0].name).to.be.eq('yes');
        expect(last.items[0].value).to.be.eq(1);
        expect(last.items[1]._id).to.be.eq(1);
        expect(last.items[1].name).to.be.eq('no');
        expect(last.items[1].value).to.be.eq(1);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });

    describe('Country List', () => {
      before(async () => {
        question = await questionFactory({ team, type: 'countryList' });
        surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
        data = {
          [country1._id]: 2,
          [country2._id]: 5,
          [country3._id]: 9,
        };
        await Promise.all([
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.from) }),
          questionStatisticFactory({ surveyItem, question, data, time: new Date(range.to) })
        ]);
      });

      it('should return correct data', async () => {
        const res = await overallQuestionReport({ surveyItem, question, timeZone });
        // expect structure
        expect(res).to.be.an('object');
        expect(res.question).to.be.an('object');
        expect(res.question.name).to.be.an('object');
        expect(res.question._id).to.be.eq(question._id);
        expect(res.question.type).to.be.eq(question.type);
        expect(res.question.name.en).to.be.eq(question.name.en);
        expect(res.question.surveyItem).to.be.eq(surveyItem._id);
        expect(res.data).to.be.an('array');
        expect(res.prevData).to.be.an('array');
        // expect data
        expect(res.data.find(d => d._id.toString() === country1._id.toString()).value)
          .to.be.eq(4);
        expect(res.data.find(d => d._id.toString() === country2._id.toString()).value)
          .to.be.eq(10);
        expect(res.data.find(d => d._id.toString() === country3._id.toString()).value)
          .to.be.eq(18);
        // expect prev data
        expect(res.prevData.length).to.be.eq(0);
      });
    });
  });
});
