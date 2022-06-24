import httpStatus from 'http-status';
import uuid from 'uuid';
import chai, { expect } from 'chai';
import request from 'supertest';
import app from 'index';

// factories
import {
  questionFactory,
  surveyFactory,
  surveyItemFactory,
  surveyResultFactory,
  surveySectionFactory,
  teamFactory,
  companyFactory,
  displayLogicFactory,
  flowItemFactory
} from '../../../../factories';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

chai.config.includeStack = true;

let company;
let team;
let survey;
let surveySection;
let surveySection1;
let surveySection2;
let question;
let surveyItem1;
let surveyItem2;
let surveyItem3;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });
}

describe('Display Logic', () => {
  before(cleanData);

  before(makeTestData);

  describe('display single question', () => {
    before(async () => {
      survey = await surveyFactory({ company, team, displaySingleQuestion: true });

      surveySection = await surveySectionFactory({ survey });

      question = await questionFactory({ company, team, type: 'text' });

      [
        surveyItem1,
        surveyItem2,
        surveyItem3
      ] = await Promise.all([
        surveyItemFactory({ company, team, survey, surveySection, sortableId: 0, question }),
        surveyItemFactory({ company, team, survey, surveySection, sortableId: 1 }),
        surveyItemFactory({ company, team, survey, surveySection, sortableId: 2 })
      ]);
    });

    it('should hide second survey item', async () => {
      const fingerprintId = uuid();

      const displayLogic = await displayLogicFactory({
        company,
        team,
        survey,
        surveyItem: surveyItem2,
        conditionSurveyItem: surveyItem1,
        display: false
      });

      await flowItemFactory({
        team,
        company,
        displayLogic,
        survey,
        questionType: 'text',
        condition: 'equal',
        value: 'hello'
      });

      await surveyResultFactory({ survey, fingerprintId });

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          fingerprintId,
          answer: { [surveyItem1._id]: 'hello' },
          surveyId: survey._id
        })
        .expect(httpStatus.OK);

      const [surveyItem] = res.body.survey.surveySection.surveyItems;

      expect(surveyItem._id.toString()).to.be.eq(surveyItem3._id.toString());

      await displayLogic.remove();
    });

    it('should complete survey', async () => {
      const fingerprintId = uuid();

      const [
        displayLogic1,
        displayLogic2
      ] = await Promise.all([
        displayLogicFactory({
          company,
          team,
          survey,
          surveyItem: surveyItem2,
          conditionSurveyItem: surveyItem1,
          display: false
        }),
        displayLogicFactory({
          company,
          team,
          survey,
          surveyItem: surveyItem3,
          conditionSurveyItem: surveyItem1,
          display: false
        })
      ]);

      await Promise.all([
        flowItemFactory({
          team,
          company,
          displayLogic: displayLogic1,
          survey,
          questionType: 'text',
          condition: 'equal',
          value: 'hello'
        }),
        flowItemFactory({
          team,
          company,
          displayLogic: displayLogic2,
          survey,
          questionType: 'text',
          condition: 'equal',
          value: 'hello'
        })
      ]);

      await surveyResultFactory({ survey, fingerprintId });

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          fingerprintId,
          answer: { [surveyItem1._id]: 'hello' },
          surveyId: survey._id
        })
        .expect(httpStatus.OK);

      expect(res.body.completed).to.be.eq(true);
    });
  });

  describe('display section', () => {
    before(async () => {
      survey = await surveyFactory({ company, team, displaySingleQuestion: true });

      [
        surveySection1,
        surveySection2
      ] = await Promise.all([
        surveySectionFactory({ survey, sortableId: 0 }),
        surveySectionFactory({ survey, sortableId: 1 })
      ]);

      question = await questionFactory({ company, team, type: 'text' });

      [
        surveyItem1,
        surveyItem2,
        surveyItem3
      ] = await Promise.all([
        surveyItemFactory({
          company, team, survey, surveySection: surveySection1, sortableId: 0, question
        }),
        surveyItemFactory({ company, team, survey, surveySection: surveySection2, sortableId: 1 }),
        surveyItemFactory({ company, team, survey, surveySection: surveySection2, sortableId: 2 })
      ]);
    });

    it('should return second section', async () => {
      const fingerprintId = uuid();

      const displayLogic = await displayLogicFactory({
        company,
        team,
        survey,
        surveyItem: surveyItem2,
        conditionSurveyItem: surveyItem1,
        display: false
      });

      await flowItemFactory({
        team,
        company,
        displayLogic,
        survey,
        questionType: 'text',
        condition: 'equal',
        value: 'hello'
      });

      await surveyResultFactory({ survey, fingerprintId });

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          fingerprintId,
          answer: { [surveyItem1._id]: 'hello' },
          surveyId: survey._id
        })
        .expect(httpStatus.OK);

      expect(res.body.survey.surveySection._id.toString()).to.be.eq(surveySection2._id.toString());

      await displayLogic.remove();
    });

    it('should complete survey', async () => {
      const fingerprintId = uuid();

      const [
        displayLogic1,
        displayLogic2
      ] = await Promise.all([
        displayLogicFactory({
          company,
          team,
          survey,
          surveyItem: surveyItem2,
          conditionSurveyItem: surveyItem1,
          display: false
        }),
        displayLogicFactory({
          company,
          team,
          survey,
          surveyItem: surveyItem3,
          conditionSurveyItem: surveyItem1,
          display: false
        })
      ]);

      await Promise.all([
        flowItemFactory({
          team,
          company,
          displayLogic: displayLogic1,
          survey,
          questionType: 'text',
          condition: 'equal',
          value: 'hello'
        }),
        flowItemFactory({
          team,
          company,
          displayLogic: displayLogic2,
          survey,
          questionType: 'text',
          condition: 'equal',
          value: 'hello'
        })
      ]);

      await surveyResultFactory({ survey, fingerprintId });

      const res = await request(app)
        .put('/api/v1/survey-answers')
        .send({
          fingerprintId,
          answer: { [surveyItem1._id]: 'hello' },
          surveyId: survey._id
        })
        .expect(httpStatus.OK);

      expect(res.body.completed).to.be.eq(true);
    });
  });
});
