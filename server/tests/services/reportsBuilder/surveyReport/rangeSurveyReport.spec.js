import chai, { expect } from 'chai';
import app from 'index'; // eslint-disable-line
import config from 'config/env';
import moment from 'moment';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// service
import rangeSurveyReport from 'server/services/reportsBuilder/helpers/rangeSurveyReport';

// factories
import {
  companyFactory,
  teamFactory,
  surveyFactory,
  questionFactory,
  surveyItemFactory,
  surveySectionFactory,
} from 'server/tests/factories';

chai.config.includeStack = true;

const timeZone = config.timezone;
const range = {
  from: moment().startOf('day').toISOString(),
  to: moment().endOf('day').toISOString()
};


let company;
let team;
let question;
let survey;
let surveySection;
let surveyItem;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });
  question = await questionFactory({ team });
  survey = await surveyFactory({ team });
  surveySection = await surveySectionFactory({ team, survey });
  surveyItem = await surveyItemFactory({ team, survey, question, surveySection });
  surveySection.surveyItems = [surveyItem];
  survey.surveySections = [surveySection];
}

describe('overallSurveyReport', () => {
  before(cleanData);

  before(makeTestData);

  it('should return correct data', async () => {
    const res = await rangeSurveyReport({ survey, timeZone, range });
    // expect structure
    expect(res).to.be.an('object');
    expect(res.survey).to.be.an('object');
    expect(res.reports).to.be.an('array');
    expect(res.survey.name).to.be.an('object');
    expect(res.survey._id.toString()).to.be.eq(survey._id.toString());
    expect(res.survey.name.en).to.be.eq(survey.name.en);
  });
});
