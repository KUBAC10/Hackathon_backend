import chai, { expect } from 'chai';
import app from 'index'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// service
import summaryQuestionReport from 'server/services/reportsBuilder/helpers/summaryQuestionReport';

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

const start = new Date(2010, 10, 20);
const end = new Date();

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

function randomDate() {
  return new Date(start.getTime() + (Math.random() * ((end.getTime() - start.getTime()))));
}

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

describe('summaryQuestionReport', () => {
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
      const res = await summaryQuestionReport({ surveyItem, question });
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
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
      ]);
    });

    it('should return correct data', async () => {
      const res = await summaryQuestionReport({ surveyItem, question });
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
      expect(res.data.length).to.be.eq(3);
      expect(res.data.every(d => d.value === 3)).to.be.eq(true);
      expect(res.data.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
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
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
      ]);
    });

    it('should return correct data', async () => {
      const res = await summaryQuestionReport({ surveyItem, question });
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
      expect(res.data.length).to.be.eq(3);
      expect(res.data.every(d => d.value === 3)).to.be.eq(true);
      expect(res.data.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
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
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
      ]);
    });

    it('should return correct data', async () => {
      const res = await summaryQuestionReport({ surveyItem, question });
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
      expect(res.data.length).to.be.eq(3);
      expect(res.data.every(d => d.value === 3)).to.be.eq(true);
      expect(res.data.every(d => questionItemIds.includes(d._id.toString()))).to.be.eq(true);
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
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
      ]);
    });

    it('should return correct data', async () => {
      const res = await summaryQuestionReport({ surveyItem, question });
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
      expect(res.data.filter(d => [0, 1, 2].includes(d._id))
        .every(d => d.value === 3)).to.be.eq(true);
      expect(res.data.filter(d => ![0, 1, 2].includes(d._id))
        .every(d => d.value === 0)).to.be.eq(true);
      expect(res.avg).to.be.eq(2);
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
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
      ]);
    });

    it('should return correct data', async () => {
      const res = await summaryQuestionReport({ surveyItem, question });
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
      expect(res.data.filter(d => [0, 1, 2].includes(d._id))
        .every(d => d.value === 3)).to.be.eq(true);
      expect(res.data.filter(d => ![0, 1, 2].includes(d._id))
        .every(d => d.value === 0)).to.be.eq(true);
      expect(res.avg).to.be.eq(2);
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
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
      ]);
    });

    it('should return correct data', async () => {
      const res = await summaryQuestionReport({ surveyItem, question });
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
        .every(d => d.value === 3)).to.be.eq(true);
      expect(res.data.filter(d => ![1, 2, 3].includes(d._id))
        .every(d => d.value === 0)).to.be.eq(true);
      expect(res.npsData.detractors).to.be.eq(9);
      expect(res.npsData.detractorsPercent).to.be.eq('100');
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
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
      ]);
    });

    it('should return correct data', async () => {
      const res = await summaryQuestionReport({ surveyItem, question });
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
        [0, 3].includes(i.value))
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
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
      ]);
    });

    it('should return correct data', async () => {
      const res = await summaryQuestionReport({ surveyItem, question });
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
        [0, 3].includes(i.value))
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
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() })
      ]);
    });

    it('should return correct data', async () => {
      const res = await summaryQuestionReport({ surveyItem, question });
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

      expect(res.data[0]._id).to.be.eq(0);
      expect(res.data[0].name).to.be.eq('yes');
      expect(res.data[0].value).to.be.eq(3);
      expect(res.data[0].percent).to.be.eq('50.0');
      expect(res.data[1]._id).to.be.eq(1);
      expect(res.data[1].name).to.be.eq('no');
      expect(res.data[1].value).to.be.eq(3);
      expect(res.data[1].percent).to.be.eq('50.0');
      // expect prev data
      expect(res.prevData.length).to.be.eq(0);
    });
  });

  describe('CountryList', () => {
    before(async () => {
      question = await questionFactory({ team, type: 'countryList' });
      surveyItem = await surveyItemFactory({ team, survey, surveySection, question });
      data = {
        [country1._id]: 2,
        [country2._id]: 5,
        [country3._id]: 9,
      };
      await Promise.all([
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
        questionStatisticFactory({ surveyItem, question, data, time: randomDate() }),
      ]);
    });

    it('should return correct data', async () => {
      const res = await summaryQuestionReport({ surveyItem, question });
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
        .to.be.eq(6);
      expect(res.data.find(d => d._id.toString() === country2._id.toString()).value)
        .to.be.eq(15);
      expect(res.data.find(d => d._id.toString() === country3._id.toString()).value)
        .to.be.eq(27);
      // expect prev data
      expect(res.prevData.length).to.be.eq(0);
    });
  });
});
