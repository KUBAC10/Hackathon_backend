import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';
import moment from 'moment';

// models
import {
  Survey,
  SurveyResult
} from '../../../../../models';

// factories
import {
  userFactory,
  surveyFactory,
  companyFactory,
  teamFactory,
  surveyItemFactory,
  questionFactory,
  questionItemFactory,
  gridRowFactory,
  gridColumnFactory, surveySectionFactory,
  tagFactory, targetFactory,
} from '../../../../factories';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

chai.config.includeStack = true;

const email = 'test@email.com';
const password = 'qwe123qwe';
const from = moment().subtract(3, 'months');
const to = moment();

let survey;
let forbiddenSurvey;
let textItem;
let textNumberItem;
let textEmailItem;
let multipleChoiceItem;
let multipleChoiceAnswerItem;
let checkboxesItem;
let checkboxesAnswerItem;
let dropdownItem;
let linearScaleItem;
let thumbsItem;
let netPromoterScoreItem;
let netPromoterScoreAnswerItem;
let sliderItem;
let checkboxMatrixItem;
let multipleChoiceMatrixItem;
let countryListItem;
let tags;
let targets;

async function makeTestData() {
  const company = await companyFactory({});
  const team = await teamFactory({ company });

  forbiddenSurvey = await surveyFactory({
    publicAccess: true,
    startDate: from,
    endDate: to
  });

  survey = await surveyFactory({
    team,
    company,
    publicAccess: true,
    startDate: from,
    endDate: to
  });

  const surveySection = await surveySectionFactory({ team, survey });

  const [
    text,
    textNumber,
    textEmail,
    multipleChoice,
    checkboxes,
    dropdown,
    linearScale,
    thumbs,
    netPromoterScore,
    netPromoterScoreAnswer,
    slider,
    checkboxMatrix,
    multipleChoiceMatrix,
    countryList
  ] = await Promise.all([
    questionFactory({ team, type: 'text' }),
    questionFactory({ team, type: 'text', input: 'number' }),
    questionFactory({ team, type: 'text', input: 'email' }),
    questionFactory({ team, type: 'multipleChoice' }),
    questionFactory({ team, type: 'checkboxes' }),
    questionFactory({ team, type: 'dropdown' }),
    questionFactory({ team, type: 'linearScale', from: 1, to: 10 }),
    questionFactory({ team, type: 'thumbs' }),
    questionFactory({ team, type: 'netPromoterScore' }),
    questionFactory({ team, type: 'netPromoterScore', textComment: true }),
    questionFactory({ team, type: 'slider', from: 1, to: 10 }),
    questionFactory({ team, type: 'checkboxMatrix' }),
    questionFactory({ team, type: 'multipleChoiceMatrix' }),
    questionFactory({ team, type: 'countryList' })
  ]);

  [
    textItem,
    textNumberItem,
    textEmailItem,
    multipleChoiceItem,
    multipleChoiceAnswerItem,
    checkboxesItem,
    checkboxesAnswerItem,
    dropdownItem,
    linearScaleItem,
    thumbsItem,
    netPromoterScoreItem,
    netPromoterScoreAnswerItem,
    sliderItem,
    checkboxMatrixItem,
    multipleChoiceMatrixItem,
    countryListItem
  ] = await Promise.all([
    surveyItemFactory({ team, survey, surveySection, question: text }),
    surveyItemFactory({ team, survey, surveySection, question: textNumber }),
    surveyItemFactory({ team, survey, surveySection, question: textEmail }),
    surveyItemFactory({ team, survey, surveySection, question: multipleChoice }),
    surveyItemFactory({
      team,
      survey,
      surveySection,
      question: multipleChoice,
      customAnswer: true
    }),
    surveyItemFactory({ team, survey, surveySection, question: checkboxes }),
    surveyItemFactory({ team, survey, surveySection, question: checkboxes, customAnswer: true }),
    surveyItemFactory({ team, survey, surveySection, question: dropdown }),
    surveyItemFactory({ team, survey, surveySection, question: linearScale }),
    surveyItemFactory({ team, survey, surveySection, question: thumbs }),
    surveyItemFactory({ team, survey, surveySection, question: netPromoterScore }),
    surveyItemFactory({ team, survey, surveySection, question: netPromoterScoreAnswer }),
    surveyItemFactory({ team, survey, surveySection, question: slider }),
    surveyItemFactory({ team, survey, surveySection, question: checkboxMatrix }),
    surveyItemFactory({ team, survey, surveySection, question: multipleChoiceMatrix }),
    surveyItemFactory({ team, survey, surveySection, question: countryList })
  ]);

  await Promise.all([
    questionItemFactory({ team, question: multipleChoice }),
    questionItemFactory({ team, question: multipleChoice }),
    questionItemFactory({ team, question: multipleChoice }),

    questionItemFactory({ team, question: checkboxes }),
    questionItemFactory({ team, question: checkboxes }),
    questionItemFactory({ team, question: checkboxes }),

    questionItemFactory({ team, question: dropdown }),
    questionItemFactory({ team, question: dropdown }),
    questionItemFactory({ team, question: dropdown }),

    gridRowFactory({ team, question: checkboxMatrix }),
    gridRowFactory({ team, question: checkboxMatrix }),
    gridRowFactory({ team, question: checkboxMatrix }),
    gridColumnFactory({ team, question: checkboxMatrix, score: 1 }),
    gridColumnFactory({ team, question: checkboxMatrix, score: 2 }),
    gridColumnFactory({ team, question: checkboxMatrix, score: 5 }),

    gridRowFactory({ team, question: multipleChoiceMatrix }),
    gridRowFactory({ team, question: multipleChoiceMatrix }),
    gridRowFactory({ team, question: multipleChoiceMatrix }),
    gridColumnFactory({ team, question: multipleChoiceMatrix, score: 1 }),
    gridColumnFactory({ team, question: multipleChoiceMatrix, score: 2 }),
    gridColumnFactory({ team, question: multipleChoiceMatrix, score: 5 }),

    userFactory({
      email,
      password,
      company,
      currentTeam: team,
      fakeDataAccess: true,
      isPowerUser: true
    })
  ]);

  tags = await Promise.all([
    tagFactory({ name: 'Tag 1' }),
    tagFactory({ name: 'Tag 2' }),
    tagFactory({ name: 'Tag 3' }),
  ]);

  targets = await Promise.all([
    targetFactory({ name: 'Target 1' }),
    targetFactory({ name: 'Target 2' }),
    targetFactory({ name: 'Target 3' }),
  ]);
}

describe('## POST /api/v1/surveys/:id/generate-fake-data', () => {
  before(cleanData);

  before(makeTestData);

  let fakeData;
  const agent = request.agent(app);
  before(async () => {
    await agent
      .post('/api/v1/authentication')
      .send({
        login: email,
        password
      });

    await agent
      .post(`/api/v1/surveys/${survey._id.toString()}/generate-fake-data`)
      .send({
        from,
        to,
        numberOfResults: 1
      })
      .expect(httpStatus.CREATED);
    // load fake results by survey
    fakeData = await SurveyResult.model
      .findOne({ survey, fake: true })
      .lean();
  });

  it('should create fake results data for text question', async () => {
    expect(fakeData.answer[textItem._id]).to.contain.keys('value');
  });

  it('should create fake results data for multipleChoice question', async () => {
    expect(fakeData.answer[multipleChoiceItem._id]).to.contain.keys('questionItems');
  });

  it('should create fake results data for countryList question', async () => {
    expect(fakeData.answer[countryListItem._id]).to.contain.keys('country');
  });

  it('should create fake results data for number question', async () => {
    expect(fakeData.answer[textNumberItem._id]).to.contain.keys('value');
  });

  it('should create fake results data for email question', async () => {
    expect(fakeData.answer[textEmailItem._id]).to.contain.keys('value');
  });

  it('should create fake results data for multipleChoice question with answer', async () => {
    expect(fakeData.answer[multipleChoiceAnswerItem._id]).to.contain.keys('questionItems');
    expect(fakeData.answer[multipleChoiceAnswerItem._id]).to.contain.keys('customAnswer');
  });

  it('should create fake results data for checkboxes question', async () => {
    expect(fakeData.answer[checkboxesItem._id]).to.contain.keys('questionItems');
  });

  it('should create fake results data for checkboxes question with answer', async () => {
    expect(fakeData.answer[checkboxesAnswerItem._id]).to.contain.keys('questionItems');
    expect(fakeData.answer[checkboxesAnswerItem._id]).to.contain.keys('customAnswer');
  });

  it('should create fake results data for dropdown question', async () => {
    expect(fakeData.answer[dropdownItem._id]).to.contain.keys('questionItems');
  });

  it('should create fake results data for linearScale question', async () => {
    expect(fakeData.answer[linearScaleItem._id]).to.contain.keys('value');
  });

  it('should create fake results data for netPromoterScore question', async () => {
    expect(fakeData.answer[netPromoterScoreItem._id]).to.contain.keys('value');
  });

  it('should create fake results data for netPromoterScore question with answer', async () => {
    expect(fakeData.answer[netPromoterScoreAnswerItem._id]).to.contain.keys('value');
    expect(fakeData.answer[netPromoterScoreAnswerItem._id]).to.contain.keys('customAnswer');
  });

  it('should create fake results data for slider question', async () => {
    expect(fakeData.answer[sliderItem._id]).to.contain.keys('value');
  });

  it('should create fake results data for multipleChoiceMatrix question', async () => {
    expect(fakeData.answer[multipleChoiceMatrixItem._id]).to.contain.keys('crossings');
  });

  it('should create fake results data for checkboxMatrix question', async () => {
    expect(fakeData.answer[checkboxMatrixItem._id]).to.contain.keys('crossings');
  });

  it('should create fake results data for thumb question', async () => {
    expect(fakeData.answer[thumbsItem._id]).to.contain.keys('value');
  });

  it('should create fake result with tag and without target', async () => {
    const expectedTag = tags[1];

    await agent
      .post(`/api/v1/surveys/${survey._id.toString()}/generate-fake-data`)
      .send({
        numberOfResults: 1,
        tags: [expectedTag._id.toString()],
        targets: []
      })
      .expect(httpStatus.CREATED);
    // load fake results by survey
    fakeData = await SurveyResult.model
      .findOne({ survey, fake: true, tags: { $eq: expectedTag._id }, target: { $exists: false } })
      .populate('tags')
      .lean();
    expect(fakeData.tags[0]._id.toString()).to.be.equal(expectedTag._id.toString());
  });

  it('should create fake result with target and without tag', async () => {
    const expectedTarget = targets[1];

    await agent
      .post(`/api/v1/surveys/${survey._id.toString()}/generate-fake-data`)
      .send({
        numberOfResults: 1,
        tags: [],
        targets: [expectedTarget._id.toString()]
      })
      .expect(httpStatus.CREATED);
    // load fake results by survey
    fakeData = await SurveyResult.model
      .findOne({ survey, fake: true, tags: { $eq: [] }, target: { $eq: expectedTarget._id } })
      .populate('target')
      .lean();
    expect(fakeData.target._id.toString()).to.be.equal(expectedTarget._id.toString());
  });

  it('should create fake result with random target and random tag', async () => {
    const tagIds = tags.map(tag => tag._id.toString());
    const targetIds = targets.map(tag => tag._id.toString());

    await agent
      .post(`/api/v1/surveys/${survey._id.toString()}/generate-fake-data`)
      .send({
        numberOfResults: 1,
        tags: tagIds,
        targets: targetIds
      })
      .expect(httpStatus.CREATED);
    // load fake results by survey
    fakeData = await SurveyResult.model
      .findOne({ survey, fake: true, tags: { $in: tagIds }, target: { $in: targetIds } })
      .populate('tags target')
      .lean();

    const fakeTagId = fakeData.tags[0]._id.toString();
    const fakeTargetId = fakeData.target._id.toString();

    expect(fakeTagId).to.be.equal(tagIds.find(tagId => tagId === fakeTagId));
    expect(fakeTargetId).to.be.equal(targetIds.find(targetId => targetId === fakeTargetId));
  });

  it('should return error when number of results is greater the 500', async () => {
    const res = await agent
      .post(`/api/v1/surveys/${survey._id}/generate-fake-data`)
      .send({
        from,
        to,
        numberOfResults: 501
      })
      .expect(httpStatus.BAD_REQUEST);

    expect(res.body.message.numberOfResults).to.be.eq('must be less than or equal to 500');
  });

  it('should return error when survey not exist', async () => {
    await agent
      .post(`/api/v1/surveys/${textItem._id}/generate-fake-data`)
      .send({
        from,
        to
      })
      .expect(httpStatus.NOT_FOUND);
  });

  it('should return error when user has not permission for create fake data for survey', async () => {
    await agent
      .post(`/api/v1/surveys/${forbiddenSurvey._id}/generate-fake-data`)
      .send({
        from,
        to
      })
      .expect(httpStatus.FORBIDDEN);
  });

  it('should set correct last answer date', async () => {
    // load survey
    const reloadSurvey = await Survey.model.findById(survey);
    // load last surveyResultItem
    const lastSurveyResult = await SurveyResult.model
      .findOne({ survey })
      .sort({ createdAt: -1 });

    expect(moment(reloadSurvey.lastAnswerDate).format('LLLL')).to.be
      .eq(moment(lastSurveyResult.createdAt).format('LLLL'));
  });
});

