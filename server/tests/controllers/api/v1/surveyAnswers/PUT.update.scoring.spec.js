import request from 'supertest';
import httpStatus from 'http-status';
import { expect } from 'chai';
import uuid from 'uuid/v4';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory,
  questionFactory,
  questionItemFactory,
  surveyFactory,
  surveyItemFactory, surveyResultFactory,
  surveySectionFactory,
  teamFactory
} from '../../../../factories';

// models
import SurveyResult from '../../../../../models/SurveyResult';

let company;
let team;
let survey;
let questionItem;
let surveyItem1;
let surveyItem2;

async function makeTestData() {
  // create company
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create survey
  survey = await surveyFactory({ team, company, scoring: true });

  // create surveySection
  const surveySection = await surveySectionFactory({
    team,
    survey
  });

  // create questions
  const [
    question,
    questionTrend
  ] = await Promise.all([
    questionFactory({ team, type: 'thumbs', scoreObj: { yes: 2, no: 1 } }),
    questionFactory({ team, type: 'dropdown', trend: true })
  ]);

  // create questionItems rows and columns
  [questionItem] = await Promise.all([
    questionItemFactory({ team, question: questionTrend, score: 1 }),
    questionItemFactory({ team, question: questionTrend, score: 1 }),
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
      question,
      sortableId: 0
    }),
    surveyItemFactory({
      team,
      survey,
      surveySection,
      question: questionTrend,
      sortableId: 1
    })
  ]);
}

describe('## PUT /api/v1/survey-answers - answers scoring', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    it('should sect correct count of score points to survey result', async () => {
      const fingerprintId = uuid();

      const surveyResult = await surveyResultFactory({ survey, fingerprintId });

      await request(app)
        .put('/api/v1/survey-answers')
        .send({
          answer: {
            [surveyItem1._id]: 'yes',
            [surveyItem2._id]: [questionItem._id],
          },
          surveyId: survey._id,
          fingerprintId
        })
        .expect(httpStatus.OK);

      const reloadResult = await SurveyResult.model.findById(surveyResult._id).lean();

      expect(reloadResult).to.be.an('object');
      expect(reloadResult.scorePoints).to.be.eq(3);
    });
  });
});
