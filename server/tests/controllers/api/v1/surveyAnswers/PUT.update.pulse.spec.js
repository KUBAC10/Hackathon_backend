import request from 'supertest';
import uuid from 'uuid/v4';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// factories
import {
  surveyFactory,
  surveyItemFactory,
  surveySectionFactory,
  questionFactory,
  companyFactory,
  teamFactory,
  pulseSurveyDriverFactory,
  pulseSurveyRoundFactory,
  pulseSurveyRoundResultFactory,
  pulseSurveyRecipientFactory,
  surveyResultFactory,
  flowLogicFactory,
  flowItemFactory
} from '../../../../factories';

// models
import { SurveyCampaign } from '../../../../../models';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

chai.config.includeStack = true;

let company;
let team;

let survey;

let driver1;
let driver2;

let section11;
let section12;
let section21;

let item1;
let item2;
let item3;
let item7;

let pulseSurveyRound;
let recipient;
let surveyCampaign;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create pulse survye
  survey = await surveyFactory({
    company,
    team,
    surveyType: 'pulse',
    displaySingleQuestion: true
  });

  // create drivers
  [
    driver1,
    driver2 // hidden
  ] = await Promise.all([
    pulseSurveyDriverFactory({ company, team, survey }),
    pulseSurveyDriverFactory({ company, team, survey, active: false })
  ]);

  // create sections
  [
    // driver1
    section11,
    section12,
    // driver3 (hidden)
    section21
  ] = await Promise.all([
    surveySectionFactory({ company, team, survey, pulseSurveyDriver: driver1, sortableId: 0 }),
    surveySectionFactory({ company, team, survey, pulseSurveyDriver: driver1, sortableId: 1 }),
    surveySectionFactory({ company, team, survey, pulseSurveyDriver: driver2, sortableId: 3 })
  ]);

  // create question
  const question = await questionFactory({ company, team, type: 'text' });

  // create survey items
  [
    // section11 driver1
    item1,
    item2,
    // section12 driver1
    item3,
    // section31 driver3 (hidden)
    item7
  ] = await Promise.all([
    surveyItemFactory({
      company,
      team,
      survey,
      question,
      surveySection: section11,
      pulseSurveyDriver: driver1,
      sortableId: 0
    }),
    surveyItemFactory({
      company,
      team,
      survey,
      question,
      surveySection: section11,
      pulseSurveyDriver: driver1,
      sortableId: 1
    }),
    surveyItemFactory({
      company,
      team,
      survey,
      question,
      surveySection: section12,
      pulseSurveyDriver: driver1,
      sortableId: 0
    }),
    surveyItemFactory({
      company,
      team,
      survey,
      question,
      surveySection: section21,
      pulseSurveyDriver: driver2,
      sortableId: 0
    })
  ]);

  // create pulse survey campaign
  surveyCampaign = await SurveyCampaign.model.findOne({ survey: survey._id });

  pulseSurveyRound = await pulseSurveyRoundFactory({ survey, surveyCampaign });

  recipient = await pulseSurveyRecipientFactory({ survey, surveyCampaign });
}

describe('## PUT /api/v1/survey-answers - pulse answers', () => {
  before(cleanData);

  before(makeTestData);

  it('should return correct survey item', async () => {
    const token = uuid();

    await pulseSurveyRoundResultFactory({
      recipient,
      survey,
      surveyCampaign,
      pulseSurveyRound,
      token,
      surveyItemsMap: {
        [item1._id]: true,
        [item2._id]: true
      }
    });

    await surveyResultFactory({ survey, token });

    const res = await request(app)
      .put('/api/v1/survey-answers')
      .send({
        answer: {
          [item1._id]: 'Hello!'
        },
        token,
      })
      .expect(httpStatus.OK);

    // console.log(res.body.survey)

    expect(res.body.survey).to.be.an('object');
    expect(res.body.survey.surveySection).to.be.an('object');

    const { surveySection } = res.body.survey;

    expect(surveySection._id.toString()).to.be.eq(section11._id.toString());
    expect(surveySection.surveyItems).to.be.an('array');
    expect(surveySection.surveyItems.length).to.be.eq(1);

    const [surveyItem] = surveySection.surveyItems;

    expect(surveyItem._id.toString()).to.be.eq(item2._id.toString());
  });

  it('should return correct survey item by items map', async () => {
    const token = uuid();

    await pulseSurveyRoundResultFactory({
      recipient,
      survey,
      surveyCampaign,
      pulseSurveyRound,
      token,
      surveyItemsMap: {
        [item1._id]: true,
        [item3._id]: true
      }
    });

    await surveyResultFactory({ survey, token });

    const res = await request(app)
      .put('/api/v1/survey-answers')
      .send({
        answer: {
          [item1._id]: 'Hello!'
        },
        token,
      })
      .expect(httpStatus.OK);

    expect(res.body.survey).to.be.an('object');
    expect(res.body.survey.surveySection).to.be.an('object');

    const { surveySection } = res.body.survey;

    expect(surveySection._id.toString()).to.be.eq(section12._id.toString());
    expect(surveySection.surveyItems).to.be.an('array');
    expect(surveySection.surveyItems.length).to.be.eq(1);

    const [surveyItem] = surveySection.surveyItems;

    expect(surveyItem._id.toString()).to.be.eq(item3._id.toString());
  });

  it('should complete survey', async () => {
    const token = uuid();

    await pulseSurveyRoundResultFactory({
      recipient,
      survey,
      surveyCampaign,
      pulseSurveyRound,
      token,
      surveyItemsMap: {
        [item1._id]: true
      }
    });

    await surveyResultFactory({ survey, token });

    const res = await request(app)
      .put('/api/v1/survey-answers')
      .send({
        answer: {
          [item1._id]: 'Hello!'
        },
        token,
      })
      .expect(httpStatus.OK);

    expect(res.body.survey).to.be.an('object');
    expect(res.body.completed).to.be.eq(true);
  });

  it('should complete survey by flow logic', async () => {
    const token = uuid();

    await pulseSurveyRoundResultFactory({
      recipient,
      survey,
      surveyCampaign,
      pulseSurveyRound,
      token,
      surveyItemsMap: {
        [item1._id]: true,
        [item2._id]: true
      }
    });

    await surveyResultFactory({ survey, token });

    const flowLogic = await flowLogicFactory({ team, company, surveyItem: item1 });

    await flowItemFactory({ team, company, survey, flowLogic, condition: 'equal', value: 'text', questionType: 'text' });

    const res = await request(app)
      .put('/api/v1/survey-answers')
      .send({
        answer: {
          [item1._id]: 'text'
        },
        token,
      })
      .expect(httpStatus.OK);

    expect(res.body.survey).to.be.an('object');
    expect(res.body.completed).to.be.eq(true);
  });

  it('should complete survey by flow logic skip to hidden section', async () => {
    const token = uuid();

    await pulseSurveyRoundResultFactory({
      recipient,
      survey,
      surveyCampaign,
      pulseSurveyRound,
      token,
      surveyItemsMap: {
        [item1._id]: true,
        [item7._id]: true
      }
    });

    await surveyResultFactory({ survey, token });

    const flowLogic = await flowLogicFactory({ team, company, surveyItem: item1, action: 'toSection', section: section21 });

    await flowItemFactory({ team, company, survey, flowLogic, condition: 'equal', value: 'text', questionType: 'text' });

    const res = await request(app)
      .put('/api/v1/survey-answers')
      .send({
        answer: {
          [item1._id]: 'text'
        },
        token,
      })
      .expect(httpStatus.OK);

    expect(res.body.survey).to.be.an('object');
    expect(res.body.completed).to.be.eq(true);
  });
});
