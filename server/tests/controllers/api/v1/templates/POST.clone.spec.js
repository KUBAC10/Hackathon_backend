import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

// factories
import {
  userFactory,
  teamFactory,
  companyFactory,
  teamUserFactory,
  surveyFactory,
  surveySectionFactory,
  questionFactory,
  surveyItemFactory,
  questionItemFactory,
  gridRowFactory,
  gridColumnFactory,
  contentItemFactory,
  surveyThemeFactory,
  flowItemFactory,
  flowLogicFactory,
  displayLogicFactory
} from '../../../../factories';

chai.config.includeStack = true;

const email = 'test@email.com';
const email2 = 'testTwo@email.com';
const password = 'qwe123qwe';

let team;
let company;
let powerUser;
let teamUser;
let survey;
let question11;
let question12;
let question21;
let question22;
let surveySection1;
let surveySection2;
let questionItem11;
let questionItem22;
let gridRow12;
let gridRow21;
let gridColumn12;
let gridColumn21;
let surveyItem11;
let surveyItem12;
let surveyItem13;
let surveyItem21;
let surveyItem22;
let surveyItem23;
let flowLogic11;
let flowLogic12;
let displayLogic11;
let flowItem11;
let flowItem12;
let displayItem11;
let endPageFlowItem;
let startPage;
let endPage;
let contentItem11;
let contentItem12;
let theme;

async function makeTestData() {
  // create company and team
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create survey
  survey = await surveyFactory({ team, company, draftData: { key: 'value' } });

  const scopes = { team, company };

  company = await companyFactory({});
  team = await teamFactory({ company });

  // create survey sections
  [
    surveySection1,
    surveySection2,
  ] = await Promise.all([
    surveySectionFactory({ team, survey, sortableId: 1, draftData: { key: 'value' } }),
    surveySectionFactory({ team, survey, sortableId: 2, draftRemove: true }),
    surveySectionFactory({ team, survey, sortableId: 0, inDraft: true }),
  ]);

  // create question
  [
    question11,
    question12,
    question21,
    question22,
  ] = await Promise.all([
    questionFactory({ team, type: 'dropdown', draftData: { key: 'value' } }),
    questionFactory({ team, type: 'checkboxMatrix', trend: true }),
    questionFactory({ team, type: 'checkboxMatrix', draftData: { key: 'value' } }),
    questionFactory({ team, type: 'dropdown', trend: true })
  ]);

  // create questionItems
  [
    questionItem11,
    questionItem22
  ] = await Promise.all([
    questionItemFactory({ team, question: question11, draftData: { key: 'value' } }),
    questionItemFactory({ team, question: question22, draftRemove: true }),
    questionItemFactory({ team, question: question11, inDraft: true }),
    questionItemFactory({ team, question: question22, inTrash: true })
  ]);

  // create gridRows and gridColumns
  [
    gridRow12,
    gridRow21,
    gridColumn12,
    gridColumn21
  ] = await Promise.all([
    gridRowFactory({ team, question: question12, draftData: { key: 'value' } }),
    gridRowFactory({ team, question: question21, draftRemove: true }),
    gridColumnFactory({ team, question: question12, draftData: { key: 'value' } }),
    gridColumnFactory({ team, question: question21, draftRemove: true }),
    gridColumnFactory({ team, question: question12, inDraft: true }),
    gridColumnFactory({ team, question: question21, inTrash: true }),
    gridRowFactory({ team, question: question12, inDraft: true }),
    gridRowFactory({ team, question: question21, inTrash: true })
  ]);

  // create surveyItems
  [
    surveyItem11,
    surveyItem12,
    surveyItem13,
    surveyItem21,
    surveyItem22,
    surveyItem23
  ] = await Promise.all([
    surveyItemFactory({ team, survey, question: question11, sortableId: 0, surveySection: surveySection1, draftData: { key: 'value' } }),
    surveyItemFactory({ team, survey, question: question12, sortableId: 1, surveySection: surveySection1, type: 'trendQuestion', draftData: { key: 'value' } }),
    surveyItemFactory({ team, survey, sortableId: 2, surveySection: surveySection1, type: 'contents', draftData: { key: 'value' } }),
    surveyItemFactory({ team, survey, question: question21, sortableId: 0, surveySection: surveySection2, draftData: { key: 'value' } }),
    surveyItemFactory({ team, survey, question: question22, sortableId: 1, surveySection: surveySection2, type: 'trendQuestion', draftData: { key: 'value' } }),
    surveyItemFactory({ team, survey, sortableId: 2, surveySection: surveySection2, type: 'contents', draftData: { key: 'value' } }),
    surveyItemFactory({
      team, survey, sortableId: 3, surveySection: surveySection1, inDraft: true
    }),
    surveyItemFactory({
      team, survey, sortableId: 3, surveySection: surveySection2, inDraft: true
    })
  ]);

  // create contentItems
  [
    startPage,
    endPage,
    contentItem11,
    contentItem12
  ] = await Promise.all([
    contentItemFactory({ team, survey, type: 'startPage', draftData: { key: 'value' } }),
    contentItemFactory({ team, survey, type: 'endPage', draftRemove: true }),
    contentItemFactory({ team, survey, surveyItem: surveyItem13, draftData: { key: 'value' } }),
    contentItemFactory({ team, survey, surveyItem: surveyItem23, draftRemove: true }),
    contentItemFactory({ team, survey, surveyItem: surveyItem13, inDraft: true }),
    contentItemFactory({ team, survey, surveyItem: surveyItem23, inTrash: true }),
    contentItemFactory({ team, survey, type: 'startPage', inDraft: true }),
    contentItemFactory({ team, survey, type: 'endPage', inTrash: true })
  ]);

  // create surveyTheme
  theme = await surveyThemeFactory({ survey, draftData: { key: 'value' } });

  // create flowLogic
  [
    flowLogic11,
    flowLogic12
  ] = await Promise.all([
    flowLogicFactory({ team, surveyItem: surveyItem11, action: 'toSection', section: surveySection2, draftRemove: true }),
    flowLogicFactory({ team, surveyItem: surveyItem12 }),
    flowLogicFactory({ team, surveyItem: surveyItem11, inDraft: true }),
    flowLogicFactory({ team, surveyItem: surveyItem12, inDraft: true }),
  ]);

  // create displayLogic
  displayLogic11 = await displayLogicFactory({
    team,
    company,
    survey,
    surveyItem: surveyItem11,
    conditionSurveyItem: surveyItem11,
    draftRemove: true
  });

  // create flowItems
  [
    flowItem11,
    flowItem12,
    displayItem11,
    endPageFlowItem
  ] = await Promise.all([
    flowItemFactory({
      survey, flowLogic: flowLogic11, questionItems: [questionItem11._id], draftRemove: true
    }),
    flowItemFactory({ team, survey, flowLogic: flowLogic12, gridRow: gridRow12, gridColumn: gridColumn12, draftData: { key: 'value' } }),
    flowItemFactory({
      survey, displayLogic: displayLogic11, questionItems: [questionItem11._id], draftRemove: true
    }),
    flowItemFactory({ team, survey, questionType: 'endPage', endPage, draftRemove: true }),
    flowItemFactory({ team, survey, flowLogic: flowLogic11, inDraft: true }),
    flowItemFactory({ team, survey, flowLogic: flowLogic12, inDraft: true })
  ]);

  ({ team, company } = scopes);

  // create power User
  powerUser = await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });
  // create Team user
  teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('## POST /api/v1/templates/clone/:id', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('As power user', () => {
      const agent = request.agent(app);

      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
      });

      it('should clone survey to template', async () => {
        const user = powerUser;
        const res = await agent
          .post(`/api/v1/templates/clone/${survey._id}`)
          .send({ type: 'template' })
          .expect(httpStatus.CREATED);

        const {
          _id,
          type,
          team,
          company,
          inDraft,
          createdBy,
          updatedBy,
          originalSurvey,
          surveySections,
          draftData,
          startPages,
          endPages,
          surveyTheme
        } = res.body;
        // Survey
        expect(_id.toString()).to.not.be.eq(survey._id.toString());
        expect(type).to.be.eq('template');
        expect(inDraft).to.be.eq(false);
        expect(team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(company.toString()).to.be.eq(user.company._id.toString());
        expect(createdBy.toString()).to.be.eq(user._id.toString());
        expect(updatedBy.toString()).to.be.eq(user._id.toString());
        expect(originalSurvey.toString()).to.be.eq(survey._id.toString());
        expect(draftData).to.be.eq(undefined);

        // surveyTheme
        expect(surveyTheme._id.toString()).to.not.be.eq(theme._id.toString());
        expect(surveyTheme.type).to.be.eq('survey');
        expect(surveyTheme.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(surveyTheme.company.toString()).to.be.eq(user.company._id.toString());
        expect(surveyTheme.createdBy.toString()).to.be.eq(user._id.toString());
        expect(surveyTheme.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(surveyTheme.survey.toString()).to.be.eq(_id.toString());
        expect(draftData).to.be.eq(undefined);

        // SurveySections
        expect(surveySections.length).to.be.eq(2);

        const [section1, section2] = surveySections;

        expect(section1._id.toString()).to.not.eq(surveySection1._id.toString());
        expect(section1.inDraft).to.be.eq(false);
        expect(section1.draftRemove).to.be.eq(false);
        expect(section1.survey.toString()).to.be.eq(_id.toString());
        expect(section1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(section1.company.toString()).to.be.eq(user.company._id.toString());
        expect(section1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(section1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(section1.sortableId).to.be.eq(1);
        expect(section1.name.en).to.be.eq(surveySection1.name.en);
        expect(section1.description.en).to.be.eq(surveySection1.description.en);
        expect(section1.draftData).to.be.eq(undefined);

        expect(section2._id.toString()).to.not.eq(surveySection2._id.toString());
        expect(section2.inDraft).to.be.eq(false);
        expect(section2.draftRemove).to.be.eq(false);
        expect(section2.survey.toString()).to.be.eq(_id.toString());
        expect(section2.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(section2.company.toString()).to.be.eq(user.company._id.toString());
        expect(section2.createdBy.toString()).to.be.eq(user._id.toString());
        expect(section2.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(section2.sortableId).to.be.eq(2);
        expect(section2.name.en).to.be.eq(surveySection2.name.en);
        expect(section2.description.en).to.be.eq(surveySection2.description.en);
        expect(section2.draftData).to.be.eq(undefined);

        expect(section1.surveyItems.length).to.be.eq(3);
        expect(section2.surveyItems.length).to.be.eq(3);
        // SurveyItems
        const [
          item11, item12, item13,
          item21, item22, item23
        ] = [
          ...section1.surveyItems,
          ...section2.surveyItems
        ];
        // Section 1 surveyItem 1
        expect(item11._id.toString()).to.not.eq(surveyItem11._id.toString());
        expect(item11.inDraft).to.be.eq(false);
        expect(item11.inTrash).to.be.eq(false);
        expect(item11.draftRemove).to.be.eq(false);
        expect(item11.sortableId).to.be.eq(0);
        expect(item11.survey.toString()).to.be.eq(_id.toString());
        expect(item11.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item11.company.toString()).to.be.eq(user.company._id.toString());
        expect(item11.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item11.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item11.draftData).to.be.eq(undefined);
        expect(item11.type).to.be.eq('question');
        // Question
        const q11 = item11.question;

        expect(q11._id.toString()).to.not.eq(question11._id.toString());
        expect(q11.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(q11.company.toString()).to.be.eq(user.company._id.toString());
        expect(q11.createdBy.toString()).to.be.eq(user._id.toString());
        expect(q11.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(q11.type).to.be.eq(question11.type);

        // QUESTION ITEM
        const [item1] = q11.questionItems;

        expect(item1._id.toString()).to.not.eq(questionItem11._id.toString());
        expect(item1.inDraft).to.be.eq(false);
        expect(item1.inTrash).to.be.eq(false);
        expect(item1.draftRemove).to.be.eq(false);
        expect(item1.sortableId).to.be.eq(0);
        expect(item1.question.toString()).to.be.eq(q11._id.toString());
        expect(item1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item1.company.toString()).to.be.eq(user.company._id.toString());
        expect(item1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item1.draftData).to.be.eq(undefined);

        // FlowLogic
        const [logic1] = item11.flowLogic;

        expect(logic1._id.toString()).to.not.eq(flowLogic11._id.toString());
        expect(logic1.inDraft).to.be.eq(false);
        expect(logic1.draftRemove).to.be.eq(false);
        expect(logic1.sortableId).to.be.eq(0);
        expect(logic1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(logic1.company.toString()).to.be.eq(user.company._id.toString());
        expect(logic1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(logic1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(logic1.draftData).to.be.eq(undefined);
        expect(logic1.section.toString()).to.be.eq(section2._id);
        expect(logic1.action).to.be.eq('toSection');

        // FlowItem
        const [flow1] = logic1.flowItems;

        expect(flow1._id.toString()).to.not.eq(flowItem11._id.toString());
        expect(flow1.inDraft).to.be.eq(false);
        expect(flow1.draftRemove).to.be.eq(false);
        expect(flow1.sortableId).to.be.eq(0);
        expect(flow1.survey.toString()).to.be.eq(_id.toString());
        expect(flow1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(flow1.company.toString()).to.be.eq(user.company._id.toString());
        expect(flow1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(flow1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(flow1.draftData).to.be.eq(undefined);
        expect(flow1.questionItems[0].toString()).to.be.eq(item1._id.toString());

        const [display1] = item11.displayLogic;

        expect(display1._id.toString()).to.not.eq(displayLogic11._id.toString());
        expect(display1.inDraft).to.be.eq(false);
        expect(display1.draftRemove).to.be.eq(false);
        expect(display1.sortableId).to.be.eq(0);
        expect(display1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(display1.company.toString()).to.be.eq(user.company._id.toString());
        expect(display1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(display1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(display1.draftData).to.be.eq(undefined);
        expect(display1.conditionSurveyItem.toString()).to.be.eq(item11._id.toString());

        const [dItem1] = display1.flowItems;

        expect(dItem1._id.toString()).to.not.eq(displayItem11._id.toString());
        expect(dItem1.inDraft).to.be.eq(false);
        expect(dItem1.draftRemove).to.be.eq(false);
        expect(dItem1.sortableId).to.be.eq(0);
        expect(dItem1.survey.toString()).to.be.eq(_id.toString());
        expect(dItem1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(dItem1.company.toString()).to.be.eq(user.company._id.toString());
        expect(dItem1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(dItem1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(dItem1.draftData).to.be.eq(undefined);
        expect(dItem1.questionItems[0].toString()).to.be.eq(item1._id.toString());

        // Section 1 surveyItem 2
        expect(item12._id.toString()).to.not.eq(surveyItem12._id.toString());
        expect(item12.question._id.toString()).to.be.eq(question12._id.toString());
        expect(item12.inDraft).to.be.eq(false);
        expect(item12.inTrash).to.be.eq(false);
        expect(item12.draftRemove).to.be.eq(false);
        expect(item12.sortableId).to.be.eq(1);
        expect(item12.survey.toString()).to.be.eq(_id.toString());
        expect(item12.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item12.company.toString()).to.be.eq(user.company._id.toString());
        expect(item12.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item12.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item12.draftData).to.be.eq(undefined);
        expect(item12.type).to.be.eq('trendQuestion');
        // Trend Question
        const q12 = item12.question;

        expect(q12._id.toString()).to.be.eq(question12._id.toString());
        expect(q12.team.toString()).to.not.be.eq(user.currentTeam._id.toString());
        expect(q12.company.toString()).to.not.be.eq(user.company._id.toString());
        expect(q12.type).to.be.eq(question12.type);
        expect(q12.trend).to.be.eq(true);

        // ROW COLUMN
        const [row1] = q12.gridRows;
        const [column1] = q12.gridColumns;

        expect(row1._id.toString()).to.be.eq(gridRow12._id.toString());
        expect(row1.inDraft).to.be.eq(false);
        expect(row1.inTrash).to.be.eq(false);
        expect(row1.draftRemove).to.be.eq(false);
        expect(row1.sortableId).to.be.eq(0);
        expect(row1.question.toString()).to.be.eq(q12._id.toString());

        expect(column1._id.toString()).to.be.eq(gridColumn12._id.toString());
        expect(column1.inDraft).to.be.eq(false);
        expect(column1.inTrash).to.be.eq(false);
        expect(column1.draftRemove).to.be.eq(false);
        expect(column1.sortableId).to.be.eq(0);
        expect(column1.question.toString()).to.be.eq(q12._id.toString());

        // FlowLogic
        const [logic2] = item12.flowLogic;

        expect(logic2._id.toString()).to.not.eq(flowLogic12._id.toString());
        expect(logic2.inDraft).to.be.eq(false);
        expect(logic2.draftRemove).to.be.eq(false);
        expect(logic2.sortableId).to.be.eq(0);
        expect(logic2.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(logic2.company.toString()).to.be.eq(user.company._id.toString());
        expect(logic2.createdBy.toString()).to.be.eq(user._id.toString());
        expect(logic2.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(logic2.draftData).to.be.eq(undefined);
        expect(logic2.action).to.be.eq('endSurvey');

        // FlowItem
        const [flow2] = logic2.flowItems;

        expect(flow2._id.toString()).to.not.eq(flowItem12._id.toString());
        expect(flow2.inDraft).to.be.eq(false);
        expect(flow2.draftRemove).to.be.eq(false);
        expect(flow2.sortableId).to.be.eq(0);
        expect(flow2.survey.toString()).to.be.eq(_id.toString());
        expect(flow2.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(flow2.company.toString()).to.be.eq(user.company._id.toString());
        expect(flow2.createdBy.toString()).to.be.eq(user._id.toString());
        expect(flow2.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(flow2.draftData).to.be.eq(undefined);
        expect(flow2.gridRow.toString()).to.be.eq(row1._id.toString());
        expect(flow2.gridColumn.toString()).to.be.eq(column1._id.toString());

        // Section 1 surveyItem 3
        expect(item13._id.toString()).to.not.eq(surveyItem13._id.toString());
        expect(item13.question).to.be.eq(undefined);
        expect(item13.inDraft).to.be.eq(false);
        expect(item13.inTrash).to.be.eq(false);
        expect(item13.draftRemove).to.be.eq(false);
        expect(item13.sortableId).to.be.eq(2);
        expect(item13.survey.toString()).to.be.eq(_id.toString());
        expect(item13.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item13.company.toString()).to.be.eq(user.company._id.toString());
        expect(item13.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item13.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item13.draftData).to.be.eq(undefined);
        expect(item13.type).to.be.eq('contents');
        // ContentItem
        const [content1] = item13.contents;

        expect(content1._id.toString()).to.not.eq(contentItem11._id.toString());
        expect(content1.inDraft).to.be.eq(false);
        expect(content1.inTrash).to.be.eq(false);
        expect(content1.draftRemove).to.be.eq(false);
        expect(content1.survey.toString()).to.be.eq(_id.toString());
        expect(content1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(content1.company.toString()).to.be.eq(user.company._id.toString());
        expect(content1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(content1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(content1.draftData).to.be.eq(undefined);
        // Section 2 surveyItem 1
        expect(item21._id.toString()).to.not.eq(surveyItem21._id.toString());
        expect(item21.inDraft).to.be.eq(false);
        expect(item21.inTrash).to.be.eq(false);
        expect(item21.draftRemove).to.be.eq(false);
        expect(item21.sortableId).to.be.eq(0);
        expect(item21.survey.toString()).to.be.eq(_id.toString());
        expect(item21.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item21.company.toString()).to.be.eq(user.company._id.toString());
        expect(item21.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item21.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item21.draftData).to.be.eq(undefined);
        expect(item21.type).to.be.eq('question');
        // Question
        const q21 = item21.question;

        expect(q21._id.toString()).to.not.eq(question21._id.toString());
        expect(q21.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(q21.company.toString()).to.be.eq(user.company._id.toString());
        expect(q21.createdBy.toString()).to.be.eq(user._id.toString());
        expect(q21.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(q21.type).to.be.eq(question21.type);

        // ROW COLUMN
        const [row2] = q21.gridRows;
        const [column2] = q21.gridColumns;

        expect(row2._id.toString()).to.not.eq(gridRow21._id.toString());
        expect(row2.inDraft).to.be.eq(false);
        expect(row2.inTrash).to.be.eq(false);
        expect(row2.draftRemove).to.be.eq(false);
        expect(row2.sortableId).to.be.eq(0);
        expect(row2.question.toString()).to.be.eq(q21._id.toString());

        expect(column2._id.toString()).to.not.eq(gridColumn21._id.toString());
        expect(column2.inDraft).to.be.eq(false);
        expect(column2.inTrash).to.be.eq(false);
        expect(column2.draftRemove).to.be.eq(false);
        expect(column2.sortableId).to.be.eq(0);
        expect(column2.question.toString()).to.be.eq(q21._id.toString());

        // Section 2 surveyItem 2
        expect(item22._id.toString()).to.not.eq(surveyItem22._id.toString());
        expect(item22.question._id.toString()).to.be.eq(question22._id.toString());
        expect(item22.inDraft).to.be.eq(false);
        expect(item22.inTrash).to.be.eq(false);
        expect(item22.draftRemove).to.be.eq(false);
        expect(item22.sortableId).to.be.eq(1);
        expect(item22.survey.toString()).to.be.eq(_id.toString());
        expect(item22.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item22.company.toString()).to.be.eq(user.company._id.toString());
        expect(item22.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item22.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item22.draftData).to.be.eq(undefined);
        expect(item22.type).to.be.eq('trendQuestion');

        // TrendQuestion
        const q22 = item22.question;

        expect(q22._id.toString()).to.be.eq(question22._id.toString());
        expect(q22.team.toString()).to.not.be.eq(user.currentTeam._id.toString());
        expect(q22.company.toString()).to.not.be.eq(user.company._id.toString());
        expect(q22.type).to.be.eq(question22.type);
        expect(q22.trend).to.be.eq(true);

        // QUESTION ITEM
        const [item2] = q22.questionItems;

        expect(item2._id.toString()).to.be.eq(questionItem22._id.toString());
        expect(item2.inDraft).to.be.eq(false);
        expect(item2.inTrash).to.be.eq(false);
        expect(item2.draftRemove).to.be.eq(true);
        expect(item2.sortableId).to.be.eq(0);
        expect(item2.question.toString()).to.be.eq(q22._id.toString());
        expect(item2.draftData).to.be.eq(undefined);

        // Section 2 surveyItem 3
        expect(item23._id.toString()).to.not.eq(surveyItem23._id.toString());
        expect(item23.question).to.be.eq(undefined);
        expect(item23.inDraft).to.be.eq(false);
        expect(item23.inTrash).to.be.eq(false);
        expect(item23.draftRemove).to.be.eq(false);
        expect(item23.sortableId).to.be.eq(2);
        expect(item23.survey.toString()).to.be.eq(_id.toString());
        expect(item23.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item23.company.toString()).to.be.eq(user.company._id.toString());
        expect(item23.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item23.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item23.draftData).to.be.eq(undefined);
        expect(item23.type).to.be.eq('contents');
        // ContentItem
        const [content2] = item23.contents;

        expect(content2._id.toString()).to.not.eq(contentItem12._id.toString());
        expect(content2.inDraft).to.be.eq(false);
        expect(content2.inTrash).to.be.eq(false);
        expect(content2.draftRemove).to.be.eq(false);
        expect(content2.survey.toString()).to.be.eq(_id.toString());
        expect(content2.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(content2.company.toString()).to.be.eq(user.company._id.toString());
        expect(content2.createdBy.toString()).to.be.eq(user._id.toString());
        expect(content2.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(content2.draftData).to.be.eq(undefined);

        // startPages
        const [start] = startPages;

        expect(start._id.toString()).to.not.eq(startPage._id.toString());
        expect(start.inDraft).to.be.eq(false);
        expect(start.inTrash).to.be.eq(false);
        expect(start.draftRemove).to.be.eq(false);
        expect(start.survey.toString()).to.be.eq(_id.toString());
        expect(start.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(start.company.toString()).to.be.eq(user.company._id.toString());
        expect(start.createdBy.toString()).to.be.eq(user._id.toString());
        expect(start.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(start.draftData).to.be.eq(undefined);

        // endPages
        const [end] = endPages;

        expect(end._id.toString()).to.not.eq(endPage._id.toString());
        expect(end.inDraft).to.be.eq(false);
        expect(end.inTrash).to.be.eq(false);
        expect(end.draftRemove).to.be.eq(false);
        expect(end.survey.toString()).to.be.eq(_id.toString());
        expect(end.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(end.company.toString()).to.be.eq(user.company._id.toString());
        expect(end.createdBy.toString()).to.be.eq(user._id.toString());
        expect(end.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(end.draftData).to.be.eq(undefined);

        // endPageFlowItem
        expect(end.flowItem._id.toString()).to.not.eq(endPageFlowItem._id.toString());
        expect(end.flowItem.inDraft).to.be.eq(false);
        expect(end.flowItem.draftRemove).to.be.eq(false);
        expect(end.flowItem.survey.toString()).to.be.eq(_id.toString());
        expect(end.flowItem.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(end.flowItem.company.toString()).to.be.eq(user.company._id.toString());
        expect(end.flowItem.createdBy.toString()).to.be.eq(user._id.toString());
        expect(end.flowItem.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(end.flowItem.draftData).to.be.eq(undefined);
      });

      it('should clone survey to survey', async () => {
        const user = powerUser;
        const res = await agent
          .post(`/api/v1/templates/clone/${survey._id}`)
          .send({ type: 'survey' })
          .expect(httpStatus.CREATED);

        const {
          _id,
          type,
          team,
          company,
          inDraft,
          createdBy,
          updatedBy,
          originalSurvey,
          surveySections,
          draftData,
          startPages,
          endPages,
          surveyTheme
        } = res.body;
        // Survey
        expect(_id.toString()).to.not.be.eq(survey._id.toString());
        expect(type).to.be.eq('survey');
        expect(inDraft).to.be.eq(false);
        expect(team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(company.toString()).to.be.eq(user.company._id.toString());
        expect(createdBy.toString()).to.be.eq(user._id.toString());
        expect(updatedBy.toString()).to.be.eq(user._id.toString());
        expect(originalSurvey.toString()).to.be.eq(survey._id.toString());
        expect(draftData).to.be.eq(undefined);

        // surveyTheme
        expect(surveyTheme._id.toString()).to.not.be.eq(theme._id.toString());
        expect(surveyTheme.type).to.be.eq('survey');
        expect(surveyTheme.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(surveyTheme.company.toString()).to.be.eq(user.company._id.toString());
        expect(surveyTheme.createdBy.toString()).to.be.eq(user._id.toString());
        expect(surveyTheme.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(surveyTheme.survey.toString()).to.be.eq(_id.toString());
        expect(draftData).to.be.eq(undefined);

        // SurveySections
        expect(surveySections.length).to.be.eq(2);

        const [section1, section2] = surveySections;

        expect(section1._id.toString()).to.not.eq(surveySection1._id.toString());
        expect(section1.inDraft).to.be.eq(false);
        expect(section1.draftRemove).to.be.eq(false);
        expect(section1.survey.toString()).to.be.eq(_id.toString());
        expect(section1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(section1.company.toString()).to.be.eq(user.company._id.toString());
        expect(section1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(section1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(section1.sortableId).to.be.eq(1);
        expect(section1.name.en).to.be.eq(surveySection1.name.en);
        expect(section1.description.en).to.be.eq(surveySection1.description.en);
        expect(section1.draftData).to.be.eq(undefined);

        expect(section2._id.toString()).to.not.eq(surveySection2._id.toString());
        expect(section2.inDraft).to.be.eq(false);
        expect(section2.draftRemove).to.be.eq(false);
        expect(section2.survey.toString()).to.be.eq(_id.toString());
        expect(section2.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(section2.company.toString()).to.be.eq(user.company._id.toString());
        expect(section2.createdBy.toString()).to.be.eq(user._id.toString());
        expect(section2.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(section2.sortableId).to.be.eq(2);
        expect(section2.name.en).to.be.eq(surveySection2.name.en);
        expect(section2.description.en).to.be.eq(surveySection2.description.en);
        expect(section2.draftData).to.be.eq(undefined);

        expect(section1.surveyItems.length).to.be.eq(3);
        expect(section2.surveyItems.length).to.be.eq(3);
        // SurveyItems
        const [
          item11, item12, item13,
          item21, item22, item23
        ] = [
          ...section1.surveyItems,
          ...section2.surveyItems
        ];
        // Section 1 surveyItem 1
        expect(item11._id.toString()).to.not.eq(surveyItem11._id.toString());
        expect(item11.inDraft).to.be.eq(false);
        expect(item11.inTrash).to.be.eq(false);
        expect(item11.draftRemove).to.be.eq(false);
        expect(item11.sortableId).to.be.eq(0);
        expect(item11.survey.toString()).to.be.eq(_id.toString());
        expect(item11.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item11.company.toString()).to.be.eq(user.company._id.toString());
        expect(item11.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item11.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item11.draftData).to.be.eq(undefined);
        expect(item11.type).to.be.eq('question');
        // Question
        const q11 = item11.question;

        expect(q11._id.toString()).to.not.eq(question11._id.toString());
        expect(q11.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(q11.company.toString()).to.be.eq(user.company._id.toString());
        expect(q11.createdBy.toString()).to.be.eq(user._id.toString());
        expect(q11.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(q11.type).to.be.eq(question11.type);

        // QUESTION ITEM
        const [item1] = q11.questionItems;

        expect(item1._id.toString()).to.not.eq(questionItem11._id.toString());
        expect(item1.inDraft).to.be.eq(false);
        expect(item1.inTrash).to.be.eq(false);
        expect(item1.draftRemove).to.be.eq(false);
        expect(item1.sortableId).to.be.eq(0);
        expect(item1.question.toString()).to.be.eq(q11._id.toString());
        expect(item1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item1.company.toString()).to.be.eq(user.company._id.toString());
        expect(item1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item1.draftData).to.be.eq(undefined);

        // FlowLogic
        const [logic1] = item11.flowLogic;

        expect(logic1._id.toString()).to.not.eq(flowLogic11._id.toString());
        expect(logic1.inDraft).to.be.eq(false);
        expect(logic1.draftRemove).to.be.eq(false);
        expect(logic1.sortableId).to.be.eq(0);
        expect(logic1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(logic1.company.toString()).to.be.eq(user.company._id.toString());
        expect(logic1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(logic1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(logic1.draftData).to.be.eq(undefined);
        expect(logic1.section.toString()).to.be.eq(section2._id.toString());
        expect(logic1.action).to.be.eq('toSection');

        // FlowItem
        const [flow1] = logic1.flowItems;

        expect(flow1._id.toString()).to.not.eq(flowItem11._id.toString());
        expect(flow1.inDraft).to.be.eq(false);
        expect(flow1.draftRemove).to.be.eq(false);
        expect(flow1.sortableId).to.be.eq(0);
        expect(flow1.survey.toString()).to.be.eq(_id.toString());
        expect(flow1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(flow1.company.toString()).to.be.eq(user.company._id.toString());
        expect(flow1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(flow1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(flow1.draftData).to.be.eq(undefined);
        expect(flow1.questionItems[0].toString()).to.be.eq(item1._id.toString());

        // Section 1 surveyItem 2
        expect(item12._id.toString()).to.not.eq(surveyItem12._id.toString());
        expect(item12.question._id.toString()).to.be.eq(question12._id.toString());
        expect(item12.inDraft).to.be.eq(false);
        expect(item12.inTrash).to.be.eq(false);
        expect(item12.draftRemove).to.be.eq(false);
        expect(item12.sortableId).to.be.eq(1);
        expect(item12.survey.toString()).to.be.eq(_id.toString());
        expect(item12.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item12.company.toString()).to.be.eq(user.company._id.toString());
        expect(item12.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item12.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item12.draftData).to.be.eq(undefined);
        expect(item12.type).to.be.eq('trendQuestion');
        // Trend Question
        const q12 = item12.question;

        expect(q12._id.toString()).to.be.eq(question12._id.toString());
        expect(q12.team.toString()).to.not.be.eq(user.currentTeam._id.toString());
        expect(q12.company.toString()).to.not.be.eq(user.company._id.toString());
        expect(q12.type).to.be.eq(question12.type);
        expect(q12.trend).to.be.eq(true);

        // ROW COLUMN
        const [row1] = q12.gridRows;
        const [column1] = q12.gridColumns;

        expect(row1._id.toString()).to.be.eq(gridRow12._id.toString());
        expect(row1.inDraft).to.be.eq(false);
        expect(row1.inTrash).to.be.eq(false);
        expect(row1.draftRemove).to.be.eq(false);
        expect(row1.sortableId).to.be.eq(0);
        expect(row1.question.toString()).to.be.eq(q12._id.toString());

        expect(column1._id.toString()).to.be.eq(gridColumn12._id.toString());
        expect(column1.inDraft).to.be.eq(false);
        expect(column1.inTrash).to.be.eq(false);
        expect(column1.draftRemove).to.be.eq(false);
        expect(column1.sortableId).to.be.eq(0);
        expect(column1.question.toString()).to.be.eq(q12._id.toString());

        // FlowLogic
        const [logic2] = item12.flowLogic;

        expect(logic2._id.toString()).to.not.eq(flowLogic12._id.toString());
        expect(logic2.inDraft).to.be.eq(false);
        expect(logic2.draftRemove).to.be.eq(false);
        expect(logic2.sortableId).to.be.eq(0);
        expect(logic2.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(logic2.company.toString()).to.be.eq(user.company._id.toString());
        expect(logic2.createdBy.toString()).to.be.eq(user._id.toString());
        expect(logic2.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(logic2.draftData).to.be.eq(undefined);
        expect(logic2.action).to.be.eq('endSurvey');

        // FlowItem
        const [flow2] = logic2.flowItems;

        expect(flow2._id.toString()).to.not.eq(flowItem12._id.toString());
        expect(flow2.inDraft).to.be.eq(false);
        expect(flow2.draftRemove).to.be.eq(false);
        expect(flow2.sortableId).to.be.eq(0);
        expect(flow2.survey.toString()).to.be.eq(_id.toString());
        expect(flow2.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(flow2.company.toString()).to.be.eq(user.company._id.toString());
        expect(flow2.createdBy.toString()).to.be.eq(user._id.toString());
        expect(flow2.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(flow2.draftData).to.be.eq(undefined);
        expect(flow2.gridRow.toString()).to.be.eq(row1._id.toString());
        expect(flow2.gridColumn.toString()).to.be.eq(column1._id.toString());

        // Section 1 surveyItem 3
        expect(item13._id.toString()).to.not.eq(surveyItem13._id.toString());
        expect(item13.question).to.be.eq(undefined);
        expect(item13.inDraft).to.be.eq(false);
        expect(item13.inTrash).to.be.eq(false);
        expect(item13.draftRemove).to.be.eq(false);
        expect(item13.sortableId).to.be.eq(2);
        expect(item13.survey.toString()).to.be.eq(_id.toString());
        expect(item13.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item13.company.toString()).to.be.eq(user.company._id.toString());
        expect(item13.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item13.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item13.draftData).to.be.eq(undefined);
        expect(item13.type).to.be.eq('contents');
        // ContentItem
        const [content1] = item13.contents;

        expect(content1._id.toString()).to.not.eq(contentItem11._id.toString());
        expect(content1.inDraft).to.be.eq(false);
        expect(content1.inTrash).to.be.eq(false);
        expect(content1.draftRemove).to.be.eq(false);
        expect(content1.survey.toString()).to.be.eq(_id.toString());
        expect(content1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(content1.company.toString()).to.be.eq(user.company._id.toString());
        expect(content1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(content1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(content1.draftData).to.be.eq(undefined);
        // Section 2 surveyItem 1
        expect(item21._id.toString()).to.not.eq(surveyItem21._id.toString());
        expect(item21.inDraft).to.be.eq(false);
        expect(item21.inTrash).to.be.eq(false);
        expect(item21.draftRemove).to.be.eq(false);
        expect(item21.sortableId).to.be.eq(0);
        expect(item21.survey.toString()).to.be.eq(_id.toString());
        expect(item21.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item21.company.toString()).to.be.eq(user.company._id.toString());
        expect(item21.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item21.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item21.draftData).to.be.eq(undefined);
        expect(item21.type).to.be.eq('question');
        // Question
        const q21 = item21.question;

        expect(q21._id.toString()).to.not.eq(question21._id.toString());
        expect(q21.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(q21.company.toString()).to.be.eq(user.company._id.toString());
        expect(q21.createdBy.toString()).to.be.eq(user._id.toString());
        expect(q21.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(q21.type).to.be.eq(question21.type);

        // ROW COLUMN
        const [row2] = q21.gridRows;
        const [column2] = q21.gridColumns;

        expect(row2._id.toString()).to.not.eq(gridRow21._id.toString());
        expect(row2.inDraft).to.be.eq(false);
        expect(row2.inTrash).to.be.eq(false);
        expect(row2.draftRemove).to.be.eq(false);
        expect(row2.sortableId).to.be.eq(0);
        expect(row2.question.toString()).to.be.eq(q21._id.toString());

        expect(column2._id.toString()).to.not.eq(gridColumn21._id.toString());
        expect(column2.inDraft).to.be.eq(false);
        expect(column2.inTrash).to.be.eq(false);
        expect(column2.draftRemove).to.be.eq(false);
        expect(column2.sortableId).to.be.eq(0);
        expect(column2.question.toString()).to.be.eq(q21._id.toString());

        // Section 2 surveyItem 2
        expect(item22._id.toString()).to.not.eq(surveyItem22._id.toString());
        expect(item22.question._id.toString()).to.be.eq(question22._id.toString());
        expect(item22.inDraft).to.be.eq(false);
        expect(item22.inTrash).to.be.eq(false);
        expect(item22.draftRemove).to.be.eq(false);
        expect(item22.sortableId).to.be.eq(1);
        expect(item22.survey.toString()).to.be.eq(_id.toString());
        expect(item22.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item22.company.toString()).to.be.eq(user.company._id.toString());
        expect(item22.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item22.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item22.draftData).to.be.eq(undefined);
        expect(item22.type).to.be.eq('trendQuestion');

        // TrendQuestion
        const q22 = item22.question;

        expect(q22._id.toString()).to.be.eq(question22._id.toString());
        expect(q22.team.toString()).to.not.be.eq(user.currentTeam._id.toString());
        expect(q22.company.toString()).to.not.be.eq(user.company._id.toString());
        expect(q22.type).to.be.eq(question22.type);
        expect(q22.trend).to.be.eq(true);

        // QUESTION ITEM
        const [item2] = q22.questionItems;

        expect(item2._id.toString()).to.be.eq(questionItem22._id.toString());
        expect(item2.inDraft).to.be.eq(false);
        expect(item2.inTrash).to.be.eq(false);
        expect(item2.draftRemove).to.be.eq(true);
        expect(item2.sortableId).to.be.eq(0);
        expect(item2.question.toString()).to.be.eq(q22._id.toString());
        expect(item2.draftData).to.be.eq(undefined);

        // Section 2 surveyItem 3
        expect(item23._id.toString()).to.not.eq(surveyItem23._id.toString());
        expect(item23.question).to.be.eq(undefined);
        expect(item23.inDraft).to.be.eq(false);
        expect(item23.inTrash).to.be.eq(false);
        expect(item23.draftRemove).to.be.eq(false);
        expect(item23.sortableId).to.be.eq(2);
        expect(item23.survey.toString()).to.be.eq(_id.toString());
        expect(item23.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item23.company.toString()).to.be.eq(user.company._id.toString());
        expect(item23.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item23.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item23.draftData).to.be.eq(undefined);
        expect(item23.type).to.be.eq('contents');
        // ContentItem
        const [content2] = item23.contents;

        expect(content2._id.toString()).to.not.eq(contentItem12._id.toString());
        expect(content2.inDraft).to.be.eq(false);
        expect(content2.inTrash).to.be.eq(false);
        expect(content2.draftRemove).to.be.eq(false);
        expect(content2.survey.toString()).to.be.eq(_id.toString());
        expect(content2.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(content2.company.toString()).to.be.eq(user.company._id.toString());
        expect(content2.createdBy.toString()).to.be.eq(user._id.toString());
        expect(content2.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(content2.draftData).to.be.eq(undefined);

        // startPages
        const [start] = startPages;

        expect(start._id.toString()).to.not.eq(startPage._id.toString());
        expect(start.inDraft).to.be.eq(false);
        expect(start.inTrash).to.be.eq(false);
        expect(start.draftRemove).to.be.eq(false);
        expect(start.survey.toString()).to.be.eq(_id.toString());
        expect(start.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(start.company.toString()).to.be.eq(user.company._id.toString());
        expect(start.createdBy.toString()).to.be.eq(user._id.toString());
        expect(start.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(start.draftData).to.be.eq(undefined);

        // endPages
        const [end] = endPages;

        expect(end._id.toString()).to.not.eq(endPage._id.toString());
        expect(end.inDraft).to.be.eq(false);
        expect(end.inTrash).to.be.eq(false);
        expect(end.draftRemove).to.be.eq(false);
        expect(end.survey.toString()).to.be.eq(_id.toString());
        expect(end.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(end.company.toString()).to.be.eq(user.company._id.toString());
        expect(end.createdBy.toString()).to.be.eq(user._id.toString());
        expect(end.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(end.draftData).to.be.eq(undefined);

        // endPageFlowItem
        expect(end.flowItem._id.toString()).to.not.eq(endPageFlowItem._id.toString());
        expect(end.flowItem.inDraft).to.be.eq(false);
        expect(end.flowItem.draftRemove).to.be.eq(false);
        expect(end.flowItem.survey.toString()).to.be.eq(_id.toString());
        expect(end.flowItem.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(end.flowItem.company.toString()).to.be.eq(user.company._id.toString());
        expect(end.flowItem.createdBy.toString()).to.be.eq(user._id.toString());
        expect(end.flowItem.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(end.flowItem.draftData).to.be.eq(undefined);
      });

      it('should set correct counter', async () => {
        // create origin surveys
        const survey = await surveyFactory({ team, company });

        // create template surveys
        await Promise.all([
          surveyFactory({ team, company, originalSurvey: survey._id, type: 'template' }),
          surveyFactory({ team, company, originalSurvey: survey._id, type: 'template' }),
          surveyFactory({ team, company, originalSurvey: survey._id, type: 'template' })
        ]);

        const res = await agent
          .post(`/api/v1/templates/clone/${survey._id}`)
          .send({ type: 'template' })
          .expect(httpStatus.CREATED);

        Object.keys(res.body.name).forEach((lang) => {
          expect(res.body.name[lang]).to.match(/003/);
        });
      });
    });

    describe('As team user', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should create template from survey', async () => {
        const user = teamUser;
        const res = await agent
          .post(`/api/v1/templates/clone/${survey._id}`)
          .send({ type: 'template' })
          .expect(httpStatus.CREATED);

        const {
          _id,
          type,
          team,
          company,
          inDraft,
          createdBy,
          updatedBy,
          originalSurvey,
          surveySections,
          draftData,
          startPages,
          endPages,
          surveyTheme
        } = res.body;
        // Survey
        expect(_id.toString()).to.not.be.eq(survey._id.toString());
        expect(type).to.be.eq('template');
        expect(inDraft).to.be.eq(false);
        expect(team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(company.toString()).to.be.eq(user.company._id.toString());
        expect(createdBy.toString()).to.be.eq(user._id.toString());
        expect(updatedBy.toString()).to.be.eq(user._id.toString());
        expect(originalSurvey.toString()).to.be.eq(survey._id.toString());
        expect(draftData).to.be.eq(undefined);

        // surveyTheme
        expect(surveyTheme._id.toString()).to.not.be.eq(theme._id.toString());
        expect(surveyTheme.type).to.be.eq('survey');
        expect(surveyTheme.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(surveyTheme.company.toString()).to.be.eq(user.company._id.toString());
        expect(surveyTheme.createdBy.toString()).to.be.eq(user._id.toString());
        expect(surveyTheme.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(surveyTheme.survey.toString()).to.be.eq(_id.toString());
        expect(draftData).to.be.eq(undefined);

        // SurveySections
        expect(surveySections.length).to.be.eq(2);

        const [section1, section2] = surveySections;

        expect(section1._id.toString()).to.not.eq(surveySection1._id.toString());
        expect(section1.inDraft).to.be.eq(false);
        expect(section1.draftRemove).to.be.eq(false);
        expect(section1.survey.toString()).to.be.eq(_id.toString());
        expect(section1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(section1.company.toString()).to.be.eq(user.company._id.toString());
        expect(section1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(section1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(section1.sortableId).to.be.eq(1);
        expect(section1.name.en).to.be.eq(surveySection1.name.en);
        expect(section1.description.en).to.be.eq(surveySection1.description.en);
        expect(section1.draftData).to.be.eq(undefined);

        expect(section2._id.toString()).to.not.eq(surveySection2._id.toString());
        expect(section2.inDraft).to.be.eq(false);
        expect(section2.draftRemove).to.be.eq(false);
        expect(section2.survey.toString()).to.be.eq(_id.toString());
        expect(section2.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(section2.company.toString()).to.be.eq(user.company._id.toString());
        expect(section2.createdBy.toString()).to.be.eq(user._id.toString());
        expect(section2.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(section2.sortableId).to.be.eq(2);
        expect(section2.name.en).to.be.eq(surveySection2.name.en);
        expect(section2.description.en).to.be.eq(surveySection2.description.en);
        expect(section2.draftData).to.be.eq(undefined);

        expect(section1.surveyItems.length).to.be.eq(3);
        expect(section2.surveyItems.length).to.be.eq(3);
        // SurveyItems
        const [
          item11, item12, item13,
          item21, item22, item23
        ] = [
          ...section1.surveyItems,
          ...section2.surveyItems
        ];
        // Section 1 surveyItem 1
        expect(item11._id.toString()).to.not.eq(surveyItem11._id.toString());
        expect(item11.inDraft).to.be.eq(false);
        expect(item11.inTrash).to.be.eq(false);
        expect(item11.draftRemove).to.be.eq(false);
        expect(item11.sortableId).to.be.eq(0);
        expect(item11.survey.toString()).to.be.eq(_id.toString());
        expect(item11.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item11.company.toString()).to.be.eq(user.company._id.toString());
        expect(item11.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item11.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item11.draftData).to.be.eq(undefined);
        expect(item11.type).to.be.eq('question');
        // Question
        const q11 = item11.question;

        expect(q11._id.toString()).to.not.eq(question11._id.toString());
        expect(q11.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(q11.company.toString()).to.be.eq(user.company._id.toString());
        expect(q11.createdBy.toString()).to.be.eq(user._id.toString());
        expect(q11.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(q11.type).to.be.eq(question11.type);

        // QUESTION ITEM
        const [item1] = q11.questionItems;

        expect(item1._id.toString()).to.not.eq(questionItem11._id.toString());
        expect(item1.inDraft).to.be.eq(false);
        expect(item1.inTrash).to.be.eq(false);
        expect(item1.draftRemove).to.be.eq(false);
        expect(item1.sortableId).to.be.eq(0);
        expect(item1.question.toString()).to.be.eq(q11._id.toString());
        expect(item1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item1.company.toString()).to.be.eq(user.company._id.toString());
        expect(item1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item1.draftData).to.be.eq(undefined);

        // FlowLogic
        const [logic1] = item11.flowLogic;

        expect(logic1._id.toString()).to.not.eq(flowLogic11._id.toString());
        expect(logic1.inDraft).to.be.eq(false);
        expect(logic1.draftRemove).to.be.eq(false);
        expect(logic1.sortableId).to.be.eq(0);
        expect(logic1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(logic1.company.toString()).to.be.eq(user.company._id.toString());
        expect(logic1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(logic1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(logic1.draftData).to.be.eq(undefined);
        expect(logic1.section.toString()).to.be.eq(section2._id);
        expect(logic1.action).to.be.eq('toSection');

        // FlowItem
        const [flow1] = logic1.flowItems;

        expect(flow1._id.toString()).to.not.eq(flowItem11._id.toString());
        expect(flow1.inDraft).to.be.eq(false);
        expect(flow1.draftRemove).to.be.eq(false);
        expect(flow1.sortableId).to.be.eq(0);
        expect(flow1.survey.toString()).to.be.eq(_id.toString());
        expect(flow1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(flow1.company.toString()).to.be.eq(user.company._id.toString());
        expect(flow1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(flow1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(flow1.draftData).to.be.eq(undefined);
        expect(flow1.questionItems[0].toString()).to.be.eq(item1._id.toString());

        // Section 1 surveyItem 2
        expect(item12._id.toString()).to.not.eq(surveyItem12._id.toString());
        expect(item12.question._id.toString()).to.be.eq(question12._id.toString());
        expect(item12.inDraft).to.be.eq(false);
        expect(item12.inTrash).to.be.eq(false);
        expect(item12.draftRemove).to.be.eq(false);
        expect(item12.sortableId).to.be.eq(1);
        expect(item12.survey.toString()).to.be.eq(_id.toString());
        expect(item12.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item12.company.toString()).to.be.eq(user.company._id.toString());
        expect(item12.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item12.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item12.draftData).to.be.eq(undefined);
        expect(item12.type).to.be.eq('trendQuestion');
        // Trend Question
        const q12 = item12.question;

        expect(q12._id.toString()).to.be.eq(question12._id.toString());
        expect(q12.team.toString()).to.not.be.eq(user.currentTeam._id.toString());
        expect(q12.company.toString()).to.not.be.eq(user.company._id.toString());
        expect(q12.type).to.be.eq(question12.type);
        expect(q12.trend).to.be.eq(true);

        // ROW COLUMN
        const [row1] = q12.gridRows;
        const [column1] = q12.gridColumns;

        expect(row1._id.toString()).to.be.eq(gridRow12._id.toString());
        expect(row1.inDraft).to.be.eq(false);
        expect(row1.inTrash).to.be.eq(false);
        expect(row1.draftRemove).to.be.eq(false);
        expect(row1.sortableId).to.be.eq(0);
        expect(row1.question.toString()).to.be.eq(q12._id.toString());

        expect(column1._id.toString()).to.be.eq(gridColumn12._id.toString());
        expect(column1.inDraft).to.be.eq(false);
        expect(column1.inTrash).to.be.eq(false);
        expect(column1.draftRemove).to.be.eq(false);
        expect(column1.sortableId).to.be.eq(0);
        expect(column1.question.toString()).to.be.eq(q12._id.toString());

        // FlowLogic
        const [logic2] = item12.flowLogic;

        expect(logic2._id.toString()).to.not.eq(flowLogic12._id.toString());
        expect(logic2.inDraft).to.be.eq(false);
        expect(logic2.draftRemove).to.be.eq(false);
        expect(logic2.sortableId).to.be.eq(0);
        expect(logic2.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(logic2.company.toString()).to.be.eq(user.company._id.toString());
        expect(logic2.createdBy.toString()).to.be.eq(user._id.toString());
        expect(logic2.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(logic2.draftData).to.be.eq(undefined);
        expect(logic2.action).to.be.eq('endSurvey');

        // FlowItem
        const [flow2] = logic2.flowItems;

        expect(flow2._id.toString()).to.not.eq(flowItem12._id.toString());
        expect(flow2.inDraft).to.be.eq(false);
        expect(flow2.draftRemove).to.be.eq(false);
        expect(flow2.sortableId).to.be.eq(0);
        expect(flow2.survey.toString()).to.be.eq(_id.toString());
        expect(flow2.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(flow2.company.toString()).to.be.eq(user.company._id.toString());
        expect(flow2.createdBy.toString()).to.be.eq(user._id.toString());
        expect(flow2.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(flow2.draftData).to.be.eq(undefined);
        expect(flow2.gridRow.toString()).to.be.eq(row1._id.toString());
        expect(flow2.gridColumn.toString()).to.be.eq(column1._id.toString());

        // Section 1 surveyItem 3
        expect(item13._id.toString()).to.not.eq(surveyItem13._id.toString());
        expect(item13.question).to.be.eq(undefined);
        expect(item13.inDraft).to.be.eq(false);
        expect(item13.inTrash).to.be.eq(false);
        expect(item13.draftRemove).to.be.eq(false);
        expect(item13.sortableId).to.be.eq(2);
        expect(item13.survey.toString()).to.be.eq(_id.toString());
        expect(item13.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item13.company.toString()).to.be.eq(user.company._id.toString());
        expect(item13.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item13.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item13.draftData).to.be.eq(undefined);
        expect(item13.type).to.be.eq('contents');
        // ContentItem
        const [content1] = item13.contents;

        expect(content1._id.toString()).to.not.eq(contentItem11._id.toString());
        expect(content1.inDraft).to.be.eq(false);
        expect(content1.inTrash).to.be.eq(false);
        expect(content1.draftRemove).to.be.eq(false);
        expect(content1.survey.toString()).to.be.eq(_id.toString());
        expect(content1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(content1.company.toString()).to.be.eq(user.company._id.toString());
        expect(content1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(content1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(content1.draftData).to.be.eq(undefined);
        // Section 2 surveyItem 1
        expect(item21._id.toString()).to.not.eq(surveyItem21._id.toString());
        expect(item21.inDraft).to.be.eq(false);
        expect(item21.inTrash).to.be.eq(false);
        expect(item21.draftRemove).to.be.eq(false);
        expect(item21.sortableId).to.be.eq(0);
        expect(item21.survey.toString()).to.be.eq(_id.toString());
        expect(item21.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item21.company.toString()).to.be.eq(user.company._id.toString());
        expect(item21.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item21.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item21.draftData).to.be.eq(undefined);
        expect(item21.type).to.be.eq('question');
        // Question
        const q21 = item21.question;

        expect(q21._id.toString()).to.not.eq(question21._id.toString());
        expect(q21.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(q21.company.toString()).to.be.eq(user.company._id.toString());
        expect(q21.createdBy.toString()).to.be.eq(user._id.toString());
        expect(q21.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(q21.type).to.be.eq(question21.type);

        // ROW COLUMN
        const [row2] = q21.gridRows;
        const [column2] = q21.gridColumns;

        expect(row2._id.toString()).to.not.eq(gridRow21._id.toString());
        expect(row2.inDraft).to.be.eq(false);
        expect(row2.inTrash).to.be.eq(false);
        expect(row2.draftRemove).to.be.eq(false);
        expect(row2.sortableId).to.be.eq(0);
        expect(row2.question.toString()).to.be.eq(q21._id.toString());

        expect(column2._id.toString()).to.not.eq(gridColumn21._id.toString());
        expect(column2.inDraft).to.be.eq(false);
        expect(column2.inTrash).to.be.eq(false);
        expect(column2.draftRemove).to.be.eq(false);
        expect(column2.sortableId).to.be.eq(0);
        expect(column2.question.toString()).to.be.eq(q21._id.toString());

        // Section 2 surveyItem 2
        expect(item22._id.toString()).to.not.eq(surveyItem22._id.toString());
        expect(item22.question._id.toString()).to.be.eq(question22._id.toString());
        expect(item22.inDraft).to.be.eq(false);
        expect(item22.inTrash).to.be.eq(false);
        expect(item22.draftRemove).to.be.eq(false);
        expect(item22.sortableId).to.be.eq(1);
        expect(item22.survey.toString()).to.be.eq(_id.toString());
        expect(item22.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item22.company.toString()).to.be.eq(user.company._id.toString());
        expect(item22.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item22.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item22.draftData).to.be.eq(undefined);
        expect(item22.type).to.be.eq('trendQuestion');

        // TrendQuestion
        const q22 = item22.question;

        expect(q22._id.toString()).to.be.eq(question22._id.toString());
        expect(q22.team.toString()).to.not.be.eq(user.currentTeam._id.toString());
        expect(q22.company.toString()).to.not.be.eq(user.company._id.toString());
        expect(q22.type).to.be.eq(question22.type);
        expect(q22.trend).to.be.eq(true);

        // QUESTION ITEM
        const [item2] = q22.questionItems;

        expect(item2._id.toString()).to.be.eq(questionItem22._id.toString());
        expect(item2.inDraft).to.be.eq(false);
        expect(item2.inTrash).to.be.eq(false);
        expect(item2.draftRemove).to.be.eq(true);
        expect(item2.sortableId).to.be.eq(0);
        expect(item2.question.toString()).to.be.eq(q22._id.toString());
        expect(item2.draftData).to.be.eq(undefined);

        // Section 2 surveyItem 3
        expect(item23._id.toString()).to.not.eq(surveyItem23._id.toString());
        expect(item23.question).to.be.eq(undefined);
        expect(item23.inDraft).to.be.eq(false);
        expect(item23.inTrash).to.be.eq(false);
        expect(item23.draftRemove).to.be.eq(false);
        expect(item23.sortableId).to.be.eq(2);
        expect(item23.survey.toString()).to.be.eq(_id.toString());
        expect(item23.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item23.company.toString()).to.be.eq(user.company._id.toString());
        expect(item23.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item23.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item23.draftData).to.be.eq(undefined);
        expect(item23.type).to.be.eq('contents');
        // ContentItem
        const [content2] = item23.contents;

        expect(content2._id.toString()).to.not.eq(contentItem12._id.toString());
        expect(content2.inDraft).to.be.eq(false);
        expect(content2.inTrash).to.be.eq(false);
        expect(content2.draftRemove).to.be.eq(false);
        expect(content2.survey.toString()).to.be.eq(_id.toString());
        expect(content2.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(content2.company.toString()).to.be.eq(user.company._id.toString());
        expect(content2.createdBy.toString()).to.be.eq(user._id.toString());
        expect(content2.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(content2.draftData).to.be.eq(undefined);

        // startPages
        const [start] = startPages;

        expect(start._id.toString()).to.not.eq(startPage._id.toString());
        expect(start.inDraft).to.be.eq(false);
        expect(start.inTrash).to.be.eq(false);
        expect(start.draftRemove).to.be.eq(false);
        expect(start.survey.toString()).to.be.eq(_id.toString());
        expect(start.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(start.company.toString()).to.be.eq(user.company._id.toString());
        expect(start.createdBy.toString()).to.be.eq(user._id.toString());
        expect(start.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(start.draftData).to.be.eq(undefined);

        // endPages
        const [end] = endPages;

        expect(end._id.toString()).to.not.eq(endPage._id.toString());
        expect(end.inDraft).to.be.eq(false);
        expect(end.inTrash).to.be.eq(false);
        expect(end.draftRemove).to.be.eq(false);
        expect(end.survey.toString()).to.be.eq(_id.toString());
        expect(end.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(end.company.toString()).to.be.eq(user.company._id.toString());
        expect(end.createdBy.toString()).to.be.eq(user._id.toString());
        expect(end.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(end.draftData).to.be.eq(undefined);

        // endPageFlowItem
        expect(end.flowItem._id.toString()).to.not.eq(endPageFlowItem._id.toString());
        expect(end.flowItem.inDraft).to.be.eq(false);
        expect(end.flowItem.draftRemove).to.be.eq(false);
        expect(end.flowItem.survey.toString()).to.be.eq(_id.toString());
        expect(end.flowItem.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(end.flowItem.company.toString()).to.be.eq(user.company._id.toString());
        expect(end.flowItem.createdBy.toString()).to.be.eq(user._id.toString());
        expect(end.flowItem.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(end.flowItem.draftData).to.be.eq(undefined);
      });

      it('should clone survey to survey', async () => {
        const user = teamUser;
        const res = await agent
          .post(`/api/v1/templates/clone/${survey._id}`)
          .send({ type: 'survey' })
          .expect(httpStatus.CREATED);

        const {
          _id,
          type,
          team,
          company,
          inDraft,
          createdBy,
          updatedBy,
          originalSurvey,
          surveySections,
          draftData,
          startPages,
          endPages,
          surveyTheme
        } = res.body;
        // Survey
        expect(_id.toString()).to.not.be.eq(survey._id.toString());
        expect(type).to.be.eq('survey');
        expect(inDraft).to.be.eq(false);
        expect(team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(company.toString()).to.be.eq(user.company._id.toString());
        expect(createdBy.toString()).to.be.eq(user._id.toString());
        expect(updatedBy.toString()).to.be.eq(user._id.toString());
        expect(originalSurvey.toString()).to.be.eq(survey._id.toString());
        expect(draftData).to.be.eq(undefined);

        // surveyTheme
        expect(surveyTheme._id.toString()).to.not.be.eq(theme._id.toString());
        expect(surveyTheme.type).to.be.eq('survey');
        expect(surveyTheme.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(surveyTheme.company.toString()).to.be.eq(user.company._id.toString());
        expect(surveyTheme.createdBy.toString()).to.be.eq(user._id.toString());
        expect(surveyTheme.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(surveyTheme.survey.toString()).to.be.eq(_id.toString());
        expect(draftData).to.be.eq(undefined);

        // SurveySections
        expect(surveySections.length).to.be.eq(2);

        const [section1, section2] = surveySections;

        expect(section1._id.toString()).to.not.eq(surveySection1._id.toString());
        expect(section1.inDraft).to.be.eq(false);
        expect(section1.draftRemove).to.be.eq(false);
        expect(section1.survey.toString()).to.be.eq(_id.toString());
        expect(section1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(section1.company.toString()).to.be.eq(user.company._id.toString());
        expect(section1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(section1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(section1.sortableId).to.be.eq(1);
        expect(section1.name.en).to.be.eq(surveySection1.name.en);
        expect(section1.description.en).to.be.eq(surveySection1.description.en);
        expect(section1.draftData).to.be.eq(undefined);

        expect(section2._id.toString()).to.not.eq(surveySection2._id.toString());
        expect(section2.inDraft).to.be.eq(false);
        expect(section2.draftRemove).to.be.eq(false);
        expect(section2.survey.toString()).to.be.eq(_id.toString());
        expect(section2.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(section2.company.toString()).to.be.eq(user.company._id.toString());
        expect(section2.createdBy.toString()).to.be.eq(user._id.toString());
        expect(section2.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(section2.sortableId).to.be.eq(2);
        expect(section2.name.en).to.be.eq(surveySection2.name.en);
        expect(section2.description.en).to.be.eq(surveySection2.description.en);
        expect(section2.draftData).to.be.eq(undefined);

        expect(section1.surveyItems.length).to.be.eq(3);
        expect(section2.surveyItems.length).to.be.eq(3);
        // SurveyItems
        const [
          item11, item12, item13,
          item21, item22, item23
        ] = [
          ...section1.surveyItems,
          ...section2.surveyItems
        ];
        // Section 1 surveyItem 1
        expect(item11._id.toString()).to.not.eq(surveyItem11._id.toString());
        expect(item11.inDraft).to.be.eq(false);
        expect(item11.inTrash).to.be.eq(false);
        expect(item11.draftRemove).to.be.eq(false);
        expect(item11.sortableId).to.be.eq(0);
        expect(item11.survey.toString()).to.be.eq(_id.toString());
        expect(item11.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item11.company.toString()).to.be.eq(user.company._id.toString());
        expect(item11.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item11.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item11.draftData).to.be.eq(undefined);
        expect(item11.type).to.be.eq('question');
        // Question
        const q11 = item11.question;

        expect(q11._id.toString()).to.not.eq(question11._id.toString());
        expect(q11.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(q11.company.toString()).to.be.eq(user.company._id.toString());
        expect(q11.createdBy.toString()).to.be.eq(user._id.toString());
        expect(q11.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(q11.type).to.be.eq(question11.type);

        // QUESTION ITEM
        const [item1] = q11.questionItems;

        expect(item1._id.toString()).to.not.eq(questionItem11._id.toString());
        expect(item1.inDraft).to.be.eq(false);
        expect(item1.inTrash).to.be.eq(false);
        expect(item1.draftRemove).to.be.eq(false);
        expect(item1.sortableId).to.be.eq(0);
        expect(item1.question.toString()).to.be.eq(q11._id.toString());
        expect(item1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item1.company.toString()).to.be.eq(user.company._id.toString());
        expect(item1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item1.draftData).to.be.eq(undefined);

        // FlowLogic
        const [logic1] = item11.flowLogic;

        expect(logic1._id.toString()).to.not.eq(flowLogic11._id.toString());
        expect(logic1.inDraft).to.be.eq(false);
        expect(logic1.draftRemove).to.be.eq(false);
        expect(logic1.sortableId).to.be.eq(0);
        expect(logic1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(logic1.company.toString()).to.be.eq(user.company._id.toString());
        expect(logic1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(logic1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(logic1.draftData).to.be.eq(undefined);
        expect(logic1.section.toString()).to.be.eq(section2._id.toString());
        expect(logic1.action).to.be.eq('toSection');

        // FlowItem
        const [flow1] = logic1.flowItems;

        expect(flow1._id.toString()).to.not.eq(flowItem11._id.toString());
        expect(flow1.inDraft).to.be.eq(false);
        expect(flow1.draftRemove).to.be.eq(false);
        expect(flow1.sortableId).to.be.eq(0);
        expect(flow1.survey.toString()).to.be.eq(_id.toString());
        expect(flow1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(flow1.company.toString()).to.be.eq(user.company._id.toString());
        expect(flow1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(flow1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(flow1.draftData).to.be.eq(undefined);
        expect(flow1.questionItems[0].toString()).to.be.eq(item1._id.toString());

        // Section 1 surveyItem 2
        expect(item12._id.toString()).to.not.eq(surveyItem12._id.toString());
        expect(item12.question._id.toString()).to.be.eq(question12._id.toString());
        expect(item12.inDraft).to.be.eq(false);
        expect(item12.inTrash).to.be.eq(false);
        expect(item12.draftRemove).to.be.eq(false);
        expect(item12.sortableId).to.be.eq(1);
        expect(item12.survey.toString()).to.be.eq(_id.toString());
        expect(item12.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item12.company.toString()).to.be.eq(user.company._id.toString());
        expect(item12.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item12.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item12.draftData).to.be.eq(undefined);
        expect(item12.type).to.be.eq('trendQuestion');
        // Trend Question
        const q12 = item12.question;

        expect(q12._id.toString()).to.be.eq(question12._id.toString());
        expect(q12.team.toString()).to.not.be.eq(user.currentTeam._id.toString());
        expect(q12.company.toString()).to.not.be.eq(user.company._id.toString());
        expect(q12.type).to.be.eq(question12.type);
        expect(q12.trend).to.be.eq(true);

        // ROW COLUMN
        const [row1] = q12.gridRows;
        const [column1] = q12.gridColumns;

        expect(row1._id.toString()).to.be.eq(gridRow12._id.toString());
        expect(row1.inDraft).to.be.eq(false);
        expect(row1.inTrash).to.be.eq(false);
        expect(row1.draftRemove).to.be.eq(false);
        expect(row1.sortableId).to.be.eq(0);
        expect(row1.question.toString()).to.be.eq(q12._id.toString());

        expect(column1._id.toString()).to.be.eq(gridColumn12._id.toString());
        expect(column1.inDraft).to.be.eq(false);
        expect(column1.inTrash).to.be.eq(false);
        expect(column1.draftRemove).to.be.eq(false);
        expect(column1.sortableId).to.be.eq(0);
        expect(column1.question.toString()).to.be.eq(q12._id.toString());

        // FlowLogic
        const [logic2] = item12.flowLogic;

        expect(logic2._id.toString()).to.not.eq(flowLogic12._id.toString());
        expect(logic2.inDraft).to.be.eq(false);
        expect(logic2.draftRemove).to.be.eq(false);
        expect(logic2.sortableId).to.be.eq(0);
        expect(logic2.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(logic2.company.toString()).to.be.eq(user.company._id.toString());
        expect(logic2.createdBy.toString()).to.be.eq(user._id.toString());
        expect(logic2.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(logic2.draftData).to.be.eq(undefined);
        expect(logic2.action).to.be.eq('endSurvey');

        // FlowItem
        const [flow2] = logic2.flowItems;

        expect(flow2._id.toString()).to.not.eq(flowItem12._id.toString());
        expect(flow2.inDraft).to.be.eq(false);
        expect(flow2.draftRemove).to.be.eq(false);
        expect(flow2.sortableId).to.be.eq(0);
        expect(flow2.survey.toString()).to.be.eq(_id.toString());
        expect(flow2.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(flow2.company.toString()).to.be.eq(user.company._id.toString());
        expect(flow2.createdBy.toString()).to.be.eq(user._id.toString());
        expect(flow2.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(flow2.draftData).to.be.eq(undefined);
        expect(flow2.gridRow.toString()).to.be.eq(row1._id.toString());
        expect(flow2.gridColumn.toString()).to.be.eq(column1._id.toString());

        // Section 1 surveyItem 3
        expect(item13._id.toString()).to.not.eq(surveyItem13._id.toString());
        expect(item13.question).to.be.eq(undefined);
        expect(item13.inDraft).to.be.eq(false);
        expect(item13.inTrash).to.be.eq(false);
        expect(item13.draftRemove).to.be.eq(false);
        expect(item13.sortableId).to.be.eq(2);
        expect(item13.survey.toString()).to.be.eq(_id.toString());
        expect(item13.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item13.company.toString()).to.be.eq(user.company._id.toString());
        expect(item13.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item13.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item13.draftData).to.be.eq(undefined);
        expect(item13.type).to.be.eq('contents');
        // ContentItem
        const [content1] = item13.contents;

        expect(content1._id.toString()).to.not.eq(contentItem11._id.toString());
        expect(content1.inDraft).to.be.eq(false);
        expect(content1.inTrash).to.be.eq(false);
        expect(content1.draftRemove).to.be.eq(false);
        expect(content1.survey.toString()).to.be.eq(_id.toString());
        expect(content1.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(content1.company.toString()).to.be.eq(user.company._id.toString());
        expect(content1.createdBy.toString()).to.be.eq(user._id.toString());
        expect(content1.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(content1.draftData).to.be.eq(undefined);
        // Section 2 surveyItem 1
        expect(item21._id.toString()).to.not.eq(surveyItem21._id.toString());
        expect(item21.inDraft).to.be.eq(false);
        expect(item21.inTrash).to.be.eq(false);
        expect(item21.draftRemove).to.be.eq(false);
        expect(item21.sortableId).to.be.eq(0);
        expect(item21.survey.toString()).to.be.eq(_id.toString());
        expect(item21.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item21.company.toString()).to.be.eq(user.company._id.toString());
        expect(item21.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item21.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item21.draftData).to.be.eq(undefined);
        expect(item21.type).to.be.eq('question');
        // Question
        const q21 = item21.question;

        expect(q21._id.toString()).to.not.eq(question21._id.toString());
        expect(q21.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(q21.company.toString()).to.be.eq(user.company._id.toString());
        expect(q21.createdBy.toString()).to.be.eq(user._id.toString());
        expect(q21.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(q21.type).to.be.eq(question21.type);

        // ROW COLUMN
        const [row2] = q21.gridRows;
        const [column2] = q21.gridColumns;

        expect(row2._id.toString()).to.not.eq(gridRow21._id.toString());
        expect(row2.inDraft).to.be.eq(false);
        expect(row2.inTrash).to.be.eq(false);
        expect(row2.draftRemove).to.be.eq(false);
        expect(row2.sortableId).to.be.eq(0);
        expect(row2.question.toString()).to.be.eq(q21._id.toString());

        expect(column2._id.toString()).to.not.eq(gridColumn21._id.toString());
        expect(column2.inDraft).to.be.eq(false);
        expect(column2.inTrash).to.be.eq(false);
        expect(column2.draftRemove).to.be.eq(false);
        expect(column2.sortableId).to.be.eq(0);
        expect(column2.question.toString()).to.be.eq(q21._id.toString());

        // Section 2 surveyItem 2
        expect(item22._id.toString()).to.not.eq(surveyItem22._id.toString());
        expect(item22.question._id.toString()).to.be.eq(question22._id.toString());
        expect(item22.inDraft).to.be.eq(false);
        expect(item22.inTrash).to.be.eq(false);
        expect(item22.draftRemove).to.be.eq(false);
        expect(item22.sortableId).to.be.eq(1);
        expect(item22.survey.toString()).to.be.eq(_id.toString());
        expect(item22.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item22.company.toString()).to.be.eq(user.company._id.toString());
        expect(item22.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item22.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item22.draftData).to.be.eq(undefined);
        expect(item22.type).to.be.eq('trendQuestion');

        // TrendQuestion
        const q22 = item22.question;

        expect(q22._id.toString()).to.be.eq(question22._id.toString());
        expect(q22.team.toString()).to.not.be.eq(user.currentTeam._id.toString());
        expect(q22.company.toString()).to.not.be.eq(user.company._id.toString());
        expect(q22.type).to.be.eq(question22.type);
        expect(q22.trend).to.be.eq(true);

        // QUESTION ITEM
        const [item2] = q22.questionItems;

        expect(item2._id.toString()).to.be.eq(questionItem22._id.toString());
        expect(item2.inDraft).to.be.eq(false);
        expect(item2.inTrash).to.be.eq(false);
        expect(item2.draftRemove).to.be.eq(true);
        expect(item2.sortableId).to.be.eq(0);
        expect(item2.question.toString()).to.be.eq(q22._id.toString());
        expect(item2.draftData).to.be.eq(undefined);

        // Section 2 surveyItem 3
        expect(item23._id.toString()).to.not.eq(surveyItem23._id.toString());
        expect(item23.question).to.be.eq(undefined);
        expect(item23.inDraft).to.be.eq(false);
        expect(item23.inTrash).to.be.eq(false);
        expect(item23.draftRemove).to.be.eq(false);
        expect(item23.sortableId).to.be.eq(2);
        expect(item23.survey.toString()).to.be.eq(_id.toString());
        expect(item23.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(item23.company.toString()).to.be.eq(user.company._id.toString());
        expect(item23.createdBy.toString()).to.be.eq(user._id.toString());
        expect(item23.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(item23.draftData).to.be.eq(undefined);
        expect(item23.type).to.be.eq('contents');
        // ContentItem
        const [content2] = item23.contents;

        expect(content2._id.toString()).to.not.eq(contentItem12._id.toString());
        expect(content2.inDraft).to.be.eq(false);
        expect(content2.inTrash).to.be.eq(false);
        expect(content2.draftRemove).to.be.eq(false);
        expect(content2.survey.toString()).to.be.eq(_id.toString());
        expect(content2.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(content2.company.toString()).to.be.eq(user.company._id.toString());
        expect(content2.createdBy.toString()).to.be.eq(user._id.toString());
        expect(content2.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(content2.draftData).to.be.eq(undefined);

        // startPages
        const [start] = startPages;

        expect(start._id.toString()).to.not.eq(startPage._id.toString());
        expect(start.inDraft).to.be.eq(false);
        expect(start.inTrash).to.be.eq(false);
        expect(start.draftRemove).to.be.eq(false);
        expect(start.survey.toString()).to.be.eq(_id.toString());
        expect(start.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(start.company.toString()).to.be.eq(user.company._id.toString());
        expect(start.createdBy.toString()).to.be.eq(user._id.toString());
        expect(start.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(start.draftData).to.be.eq(undefined);

        // endPages
        const [end] = endPages;

        expect(end._id.toString()).to.not.eq(endPage._id.toString());
        expect(end.inDraft).to.be.eq(false);
        expect(end.inTrash).to.be.eq(false);
        expect(end.draftRemove).to.be.eq(false);
        expect(end.survey.toString()).to.be.eq(_id.toString());
        expect(end.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(end.company.toString()).to.be.eq(user.company._id.toString());
        expect(end.createdBy.toString()).to.be.eq(user._id.toString());
        expect(end.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(end.draftData).to.be.eq(undefined);

        // endPageFlowItem
        expect(end.flowItem._id.toString()).to.not.eq(endPageFlowItem._id.toString());
        expect(end.flowItem.inDraft).to.be.eq(false);
        expect(end.flowItem.draftRemove).to.be.eq(false);
        expect(end.flowItem.survey.toString()).to.be.eq(_id.toString());
        expect(end.flowItem.team.toString()).to.be.eq(user.currentTeam._id.toString());
        expect(end.flowItem.company.toString()).to.be.eq(user.company._id.toString());
        expect(end.flowItem.createdBy.toString()).to.be.eq(user._id.toString());
        expect(end.flowItem.updatedBy.toString()).to.be.eq(user._id.toString());
        expect(end.flowItem.draftData).to.be.eq(undefined);
      });

      it('should set correct counter', async () => {
        // create origin surveys
        const survey = await surveyFactory({ team, company });

        // create template surveys
        await Promise.all([
          surveyFactory({ team, company, originalSurvey: survey._id, type: 'template' }),
          surveyFactory({ team, company, originalSurvey: survey._id, type: 'template' }),
          surveyFactory({ team, company, originalSurvey: survey._id, type: 'template' })
        ]);

        const res = await agent
          .post(`/api/v1/templates/clone/${survey._id}`)
          .send({ type: 'template' })
          .expect(httpStatus.CREATED);

        Object.keys(res.body.name).forEach((lang) => {
          expect(res.body.name[lang]).to.match(/003/);
        });
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post(`/api/v1/templates/clone/${survey._id}`)
        .send({ type: 'template' })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
