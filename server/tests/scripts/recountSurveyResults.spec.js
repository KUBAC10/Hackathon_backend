import chai, { expect } from 'chai';
import _ from 'lodash';
import app from 'index'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory,
  surveyFactory,
  surveyResultFactory
} from 'server/tests/factories';

// scripts
import { recountSurveyResults } from 'server/scripts';

// models
import {
  Survey
} from 'server/models';

chai.config.includeStack = true;

let company;
let survey1;
let survey2;

async function makeTestData() {
  company = await companyFactory({});

  // create surveys
  [survey1, survey2] = await Promise.all([
    surveyFactory({ company }),
    surveyFactory({ company }),
  ]);

  // create survey results to first survey
  for (const i of _.times(10)) { // eslint-disable-line
    await surveyResultFactory({
      company,
      token: Math.random() + i,
      survey: survey1,
      team: survey1.team._id,
      empty: false
    });
  }

  // create empty results - should not count
  for (const i of _.times(10)) { // eslint-disable-line
    await surveyResultFactory({
      company,
      empty: true,
      token: Math.random() + i,
      survey: survey1,
      team: survey1.team._id
    });
  }

  // create completed results for first survey
  for (const i of _.times(3)) { // eslint-disable-line
    await surveyResultFactory({
      company,
      token: Math.random() + i,
      survey: survey1,
      team: survey1.team._id,
      completed: true,
      empty: false
    });
  }

  // create survey results to second survey
  for (const i of _.times(5)) { // eslint-disable-line
    await surveyResultFactory({
      company,
      token: Math.random() + i,
      survey: survey2,
      team: survey2.team._id,
      empty: false
    });
  }

  // create completed results for second survey
  for (const i of _.times(2)) { // eslint-disable-line
    await surveyResultFactory({
      company,
      token: Math.random() + i,
      survey: survey2,
      team: survey2.team._id,
      completed: true,
      empty: false
    });
  }

  // drop first survey counters
  survey1.totalResults = 0;
  survey1.totalCompleted = 0;

  await survey1.save();
}

describe('Scripts: recount survey results', () => {
  describe('Pre save', () => {
    before(cleanData);

    before(makeTestData);

    it('should recalculate survey results', async () => {
      // run script
      await recountSurveyResults();

      // reload surveys
      const survey1Reload = await Survey.model.findOne({ _id: survey1 });
      const survey2Reload = await Survey.model.findOne({ _id: survey2 });

      expect(survey1Reload.totalResults).to.be.eq(13);
      expect(survey1Reload.totalCompleted).to.be.eq(3);

      expect(survey2Reload.totalResults).to.be.eq(7);
      expect(survey2Reload.totalCompleted).to.be.eq(2);
    });
  });
});
