import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import _ from 'lodash';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import {
  PulseSurveyDriver,
  SurveySection,
  SurveyItem,
  ContentItem,
  QuestionItem,
  FlowLogic,
  FlowItem,
  Trash
} from 'server/models';

// factories
import {
  userFactory,
  companyFactory,
  teamUserFactory,
  teamFactory,
  surveyFactory,
  surveySectionFactory,
  questionFactory,
  surveyItemFactory,
  contentItemFactory,
  questionItemFactory,
  gridRowFactory,
  gridColumnFactory,
  flowItemFactory,
  flowLogicFactory,
  pulseSurveyDriverFactory,
  contentItemElementFactory,
  displayLogicFactory
} from '../../../../factories';
import ContentItemElement from '../../../../../models/ContentItemElement';
import DisplayLogic from '../../../../../models/DisplayLogic';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'poweser@email.com';
const email2 = 'teamusser@email.com';
const email3 = 'templateMaker@emeil.com';

let team;
let company;
let survey;
let surveySection;
let question;
let phoneQuestion;
let bulkQuestion;
let surveyItem;
let contentItem;
let questionItem;
let gridRow;
let gridColumn;
let flowLogic;
let displayLogic;
let flowItem;
let powerUser;
let teamUser;
let templateMaker;

async function makeTestData(done) {
  // create company
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create users
  powerUser = await userFactory({ email, password, currentTeam: team, company, isPowerUser: true });
  await teamUserFactory({ user: powerUser, team, company });

  // create Team user
  teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });

  // create Template Maker
  templateMaker = await userFactory({
    email: email3,
    password,
    currentTeam: team,
    company,
    isPowerUser: true,
    isTemplateMaker: true
  });
  await teamUserFactory({ user: templateMaker, team, company });
  done();
}

describe('## POST /api/v1/drafts/:id', () => {
  before((done) => {
    cleanData(done);
  });

  before((done) => {
    makeTestData(done);
  });

  describe('Authorized', () => {
    describe('As Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email
          });

        question = await questionFactory({ team, company, inDraft: true });
        phoneQuestion = await questionFactory({ type: 'text', input: 'phone', team, company, inDraft: true });
        bulkQuestion = await questionFactory({ type: 'dropdown', team, company, inDraft: true });
        survey = await surveyFactory({ team, company, inDraft: true });

        [
          questionItem,
          gridRow,
          gridColumn,
          surveySection,
          surveyItem,
          contentItem,
          flowLogic,
          displayLogic,
          flowItem
        ] = await Promise.all([
          questionItemFactory({ team, company, inDraft: true, question: question._id }),
          gridRowFactory({ team, company, inDraft: true, question: question._id }),
          gridColumnFactory({ team, company, inDraft: true, question: question._id }),
          surveySectionFactory({ team, company, survey, inDraft: true }),
          surveyItemFactory({ team, company, survey, inDraft: true }),
          contentItemFactory({ team, company, survey }),
          flowLogicFactory({ team, company, inDraft: true }),
          displayLogicFactory({ team, company, inDraft: true }),
          flowItemFactory({ team, company, survey, inDraft: true }),
          questionItemFactory({ team, company, inDraft: true, question: question._id }),
          gridRowFactory({ team, company, inDraft: true, question: question._id }),
          gridColumnFactory({ team, company, inDraft: true, question: question._id })
        ]);
      });

      describe('create', () => {
        it('should return error because doc is not found', async () => {
          await agent
            .post(`/api/v1/drafts/${flowItem._id}`)
            .send({
              entity: 'flowItem',
              action: 'remove',
              entityId: flowItem._id
            })
            .expect(httpStatus.NOT_FOUND);
        });

        it('should return error if user hasn\'t permission', async () => {
          const survey = await surveyFactory({});

          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowItem',
              action: 'remove',
              entityId: flowItem._id
            })
            .expect(httpStatus.FORBIDDEN);
        });

        it('should create draft surveySection', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveySection',
              action: 'create',
              data: {
                index: 1,
                survey: survey._id
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.survey).to.be.eq(survey._id.toString());
          expect(res.body.sortableId).to.be.eq(1);
          expect(res.body.inDraft).to.be.eq(true);
        });

        xit('should set correct sortable id to new section', async () => {

        });

        it('should create draft surveyItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'create',
              data: {
                type: 'question',
                surveySection: surveySection._id,
                question: 'dropdown'
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.survey).to.be.eq(survey._id.toString());
          expect(res.body.surveySection).to.be.eq(surveySection._id.toString());
          expect(res.body.sortableId).to.be.eq(0);
          expect(res.body.inDraft).to.be.eq(true);
          expect(res.body.question).to.be.an('object');
          expect(res.body.question.questionItems.length).to.be.eq(1);
        });

        it('should create draft surveyItem with correct sortableId', async () => {
          const surveySection = await surveySectionFactory({ company, team, survey });

          await Promise.all([
            surveyItemFactory({ company, team, surveySection, sortableId: 0 }),
            surveyItemFactory({ company, team, surveySection, sortableId: 1 }),
          ]);

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'create',
              data: {
                type: 'question',
                surveySection: surveySection._id,
                question: 'dropdown',
                index: 0
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.survey).to.be.eq(survey._id.toString());
          expect(res.body.surveySection).to.be.eq(surveySection._id.toString());
          expect(res.body.sortableId).to.be.eq(0.5);
          expect(res.body.inDraft).to.be.eq(true);
          expect(res.body.question).to.be.an('object');
          expect(res.body.question.questionItems.length).to.be.eq(1);
        });

        it('should create draft surveyItem and clone general question', async () => {
          const generalQuestion = await questionFactory({ team, company, general: true });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'create',
              data: {
                type: 'question',
                surveySection: surveySection._id,
                question: generalQuestion._id
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.survey).to.be.eq(survey._id.toString());
          expect(res.body.surveySection).to.be.eq(surveySection._id.toString());
          expect(res.body.sortableId).to.be.eq(1);
          expect(res.body.inDraft).to.be.eq(true);

          const { question } = res.body;

          expect(question).to.be.an('object');
          expect(question._id.toString()).to.not.eq(generalQuestion._id.toString());
          expect(question.team.toString()).to.be.eq(powerUser.currentTeam._id.toString());
          expect(question.company.toString()).to.be.eq(powerUser.company._id.toString());
          expect(question.createdBy.toString()).to.be.eq(powerUser._id.toString());
          expect(question.updatedBy.toString()).to.be.eq(powerUser._id.toString());
          expect(question.type).to.be.eq(generalQuestion.type);
        });

        it('should create number question', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'create',
              type: 'question',
              data: {
                type: 'question',
                surveySection: surveySection._id,
                question: 'text',
                questionInput: 'number'
              }
            })
            .expect(httpStatus.CREATED);

          const { question } = res.body;

          expect(question.input).to.be.eq('number');
          expect(question.linearScale.from).to.be.eq(null);
          expect(question.linearScale.to).to.be.eq(null);
        });

        it('should create thumbs question', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'create',
              type: 'question',
              data: {
                type: 'question',
                surveySection: surveySection._id,
                question: 'thumbs',
                fromCaption: { en: 'fromCaption' },
                toCaption: { en: 'toCaption' }
              }
            })
            .expect(httpStatus.CREATED);

          const { question } = res.body;

          expect(question.type).to.be.eq('thumbs');
          expect(question.linearScale.fromCaption.en).to.be.eq('fromCaption');
          expect(question.linearScale.toCaption.en).to.be.eq('toCaption');
        });

        it('should create slider question', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'create',
              type: 'question',
              data: {
                type: 'question',
                surveySection: surveySection._id,
                question: 'slider',
              }
            })
            .expect(httpStatus.CREATED);

          const { question } = res.body;

          expect(question.type).to.be.eq('slider');
          expect(question.linearScale.from).to.be.eq(0);
          expect(question.linearScale.to).to.be.eq(100);
        });

        xit('should set correct sortable id to new surveyItem', async () => {

        });

        it('should create draft contentItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'create',
              data: {
                survey: survey._id,
                surveyItem: surveyItem._id,
                surveyItemSortableId: 0,
                index: 0,
                type: 'content',
                contentType: 'text',
                text: { en: 'Hello' },
                surveyItemType: 'contents'
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.inDraft).to.be.eq(true);
          expect(res.body.surveyItem.toString()).to.be.eq(surveyItem._id.toString());
          expect(res.body.sortableId).to.be.eq(0);
          expect(res.body.type).to.be.eq('content');
          expect(res.body.contentType).to.be.eq('text');
          expect(res.body.text.en).to.be.eq('Hello');
        });

        it('should set correct sortable id to new contentItem to Top position', async () => {
          const survey = await surveyFactory({ team, company, inDraft: true });
          const surveyItem = await surveyItemFactory({ team, company, survey });
          await Promise.all([
            contentItemFactory({ team, company, survey, sortableId: 0, surveyItem }),
            contentItemFactory({ team, company, survey, sortableId: 1, surveyItem }),
            contentItemFactory({ team, company, survey, sortableId: 2, surveyItem })
          ]);

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'create',
              data: {
                index: -1,
                survey: survey._id,
                surveyItem: surveyItem._id,
                type: 'content',
                contentType: 'socialIcons'
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.surveyItem.toString()).to.be.eq(surveyItem._id.toString());
          expect(res.body.sortableId).to.be.eq(-1);
        });

        it('should set correct sortable id to new surveyItem to Top position', async () => {
          const survey = await surveyFactory({ team, company, inDraft: true });
          const surveySection = await surveySectionFactory({ team, company, survey });

          Promise.all([
            surveyItemFactory({ team, company, survey, surveySection, sortableId: 0 }),
            surveyItemFactory({ team, company, survey, surveySection, sortableId: 1 }),
            surveyItemFactory({ team, company, survey, surveySection, sortableId: 2 })
          ]);


          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'create',
              data: {
                type: 'question',
                surveySection: surveySection._id,
                question: 'dropdown',
                index: -1
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.sortableId).to.be.eq(-1);
        });

        it('should set correct sortable id to new startPage if passed a new index position for it', async () => {
          const survey = await surveyFactory({ team, company, inDraft: true });
          const surveyItem = await surveyItemFactory({ team, company, survey });
          await Promise.all([
            contentItemFactory({ team, company, survey, sortableId: 0, surveyItem, type: 'startPage' }),
            contentItemFactory({ team, company, survey, sortableId: 1, surveyItem, type: 'startPage' }),
            contentItemFactory({ team, company, survey, sortableId: 2, surveyItem, type: 'startPage' })
          ]);

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'create',
              data: {
                contentType: 'contentImage',
                dataType: 'unsplash',
                dataUrl: 'dataUrl',
                survey: survey._id,
                index: 1,
                type: 'startPage'
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.sortableId).to.be.eq(1.5);
        });

        it('should set correct sortable id to new endPage if passed a new index position for it', async () => {
          const survey = await surveyFactory({ team, company, inDraft: true });
          const surveyItem = await surveyItemFactory({ team, company, survey });
          await Promise.all([
            contentItemFactory({ team, company, survey, sortableId: 0, surveyItem, type: 'endPage' }),
            contentItemFactory({ team, company, survey, sortableId: 1, surveyItem, type: 'endPage' }),
            contentItemFactory({ team, company, survey, sortableId: 2, surveyItem, type: 'endPage' })
          ]);

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'create',
              data: {
                contentType: 'contentImage',
                dataType: 'unsplash',
                dataUrl: 'dataUrl',
                survey: survey._id,
                index: 1,
                type: 'endPage'
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.sortableId).to.be.eq(1.5);
        });

        it('should set correct sortable id to new startPage as a regular next item', async () => {
          const survey = await surveyFactory({ team, company, inDraft: true });
          const surveyItem = await surveyItemFactory({ team, company, survey });
          await Promise.all([
            contentItemFactory({ team, company, survey, sortableId: 0, surveyItem, type: 'startPage' }),
            contentItemFactory({ team, company, survey, sortableId: 1, surveyItem, type: 'startPage' }),
            contentItemFactory({ team, company, survey, sortableId: 2, surveyItem, type: 'startPage' })
          ]);

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'create',
              data: {
                contentType: 'contentImage',
                dataType: 'unsplash',
                dataUrl: 'dataUrl',
                survey: survey._id,
                type: 'startPage'
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.sortableId).to.be.eq(3);
        });

        it('should set correct sortable id to new endPage as a regular next item', async () => {
          const survey = await surveyFactory({ team, company, inDraft: true });
          const surveyItem = await surveyItemFactory({ team, company, survey });
          await Promise.all([
            contentItemFactory({ team, company, survey, sortableId: 0, surveyItem, type: 'endPage' }),
            contentItemFactory({ team, company, survey, sortableId: 1, surveyItem, type: 'endPage' }),
            contentItemFactory({ team, company, survey, sortableId: 2, surveyItem, type: 'endPage' })
          ]);

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'create',
              data: {
                contentType: 'contentImage',
                dataType: 'unsplash',
                dataUrl: 'dataUrl',
                survey: survey._id,
                type: 'endPage'
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.sortableId).to.be.eq(3);
        });

        xit('should create draft surveyItem with question', async () => {

        });

        xit('should create draft surveyItem with question with questionItems', async () => {

        });

        xit('should create draft surveyItem with question with gridItems', async () => {

        });

        it('should create draft questionItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'questionItem',
              action: 'create',
              data: {
                question: question._id,
                index: 0
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.question).to.be.eq(question._id.toString());
          expect(res.body.inDraft).to.be.eq(true);
        });

        it('should create draft through bulk options for questionItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'questionItem',
              action: 'create',
              data: {
                question: bulkQuestion._id,
                name: _.fill(Array(50), 'Option')
              }
            })
            .expect(httpStatus.CREATED);

          const options = res.body;

          expect(options.length).to.be.eq(50);

          expect(options.every(options => options.question === bulkQuestion._id.toString()))
            .to.be.eq(true);
          expect(options.every(options => options.inDraft === true)).to.be.eq(true);
          options.forEach((item, index) => {
            expect(item.draftData.sortableId === index).to.be.eq(true);
          });
        }).timeout(5000);

        it('should return bad request if options less than 1', async () => {
          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'questionItem',
              action: 'create',
              data: {
                question: bulkQuestion._id,
                name: []
              }
            })
            .expect(httpStatus.BAD_REQUEST);
        });

        it('should return bad request if options more than 50', async () => {
          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'questionItem',
              action: 'create',
              data: {
                question: bulkQuestion._id,
                name: _.fill(Array(51), 'Option')
              }
            })
            .expect(httpStatus.BAD_REQUEST);
        });

        it('should create draft gridRow', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridRow',
              action: 'create',
              data: {
                question: question._id,
                index: 0
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.question).to.be.eq(question._id.toString());
          expect(res.body.inDraft).to.be.eq(true);
        });

        it('should create draft gridColumn', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridColumn',
              action: 'create',
              data: {
                question: question._id,
                index: 0
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.question).to.be.eq(question._id.toString());
          expect(res.body.inDraft).to.be.eq(true);
        });

        it('should create draft flowLogic', async () => {
          const surveyItem = await surveyItemFactory({ team, company });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowLogic',
              action: 'create',
              data: {
                surveyItem: surveyItem._id,
                method: 'every',
                action: 'endSurvey',
                questionType: 'text',
                index: 0
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.surveyItem.toString()).to.be.eq(surveyItem._id.toString());
          expect(res.body.method).to.be.eq('every');
          expect(res.body.action).to.be.eq('endSurvey');
          expect(res.body.inDraft).to.be.eq(true);

          const [flowItem] = res.body.flowItems;

          expect(flowItem.inDraft).to.be.eq(true);
          expect(flowItem.questionType).to.be.eq('text');
          expect(flowItem.flowLogic.toString()).to.be.eq(res.body._id.toString());
        });

        it('should create draft displayLogic', async () => {
          const surveyItem = await surveyItemFactory({ team, company });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'displayLogic',
              action: 'create',
              data: {
                surveyItem: surveyItem._id,
                method: 'every'
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.surveyItem.toString()).to.be.eq(surveyItem._id.toString());
          expect(res.body.method).to.be.eq('every');
          expect(res.body.display).to.be.eq(true);
          expect(res.body.inDraft).to.be.eq(true);
        });

        it('should create draft flowItem', async () => {
          const flowLogic = await flowLogicFactory({ team, company });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowItem',
              action: 'create',
              data: {
                flowLogic: flowLogic._id,
                questionType: 'text',
                condition: 'equal',
                value: 'value',
                index: 0
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.flowLogic.toString()).to.be.eq(flowLogic._id.toString());
          expect(res.body.questionType).to.be.eq('text');
          expect(res.body.condition).to.be.eq('equal');
          expect(res.body.value).to.be.eq('value');
        });

        it('should create draft endPage flowItem', async () => {
          const endPage = await contentItemFactory({ team, company, survey });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowItem',
              action: 'create',
              data: {
                endPage: endPage._id,
                questionType: 'endPage',
                condition: 'range',
                range: {
                  from: 1,
                  to: 2
                }
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.questionType).to.be.eq('endPage');
          expect(res.body.condition).to.be.eq('range');
          expect(res.body.range.from).to.be.eq(1);
          expect(res.body.range.to).to.be.eq(2);
        });

        xit('should create draft surveyItem with content', async () => {

        });

        it('should create draft content item element', async () => {
          const endPage = await contentItemFactory({ team, company, survey });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItemElement',
              action: 'create',
              data: {
                contentItem: endPage._id,
                type: 'link'
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.contentItem.toString()).to.be.eq(endPage._id.toString());
          expect(res.body.type).to.be.eq('link');
          expect(res.body.inDraft).to.be.eq(true);
        });
      });

      describe('update', () => {
        it('should update draft surveySection', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveySection',
              action: 'update',
              entityId: surveySection._id,
              data: {
                name: { de: 'New Name' },
                translationLockName: { de: true },
                description: { de: 'New Description' },
                translationLockDescription: { de: true },
                displaySingle: true,
                hide: true
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.hide).to.be.eq(true);
          expect(res.body.name.de).to.be.eq('New Name');
          expect(res.body.translationLockName.de).to.be.eq(true);
          expect(res.body.description.de).to.be.eq('New Description');
          expect(res.body.translationLockDescription.de).to.be.eq(true);
          expect(res.body.displaySingle).to.be.eq(true);
        });

        it('should update draft surveySection sortableId', async () => {
          const survey = await surveyFactory({ team, company });

          const [
            section1,
            section2,
            section3
          ] = await Promise.all([
            surveySectionFactory({ team, company, survey, sortableId: 0 }),
            surveySectionFactory({ team, company, survey, sortableId: 1 }),
            surveySectionFactory({ team, company, survey, sortableId: 2 })
          ]);

          const res1 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveySection',
              action: 'update',
              entityId: section1._id,
              data: {
                index: 2
              }
            })
            .expect(httpStatus.OK);

          expect(res1.body.draftData.sortableId).to.be.eq(3);

          const res2 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveySection',
              action: 'update',
              entityId: section2._id,
              data: {
                index: 0
              }
            })
            .expect(httpStatus.OK);

          expect(res2.body.draftData.sortableId).to.be.eq(0);

          const res3 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveySection',
              action: 'update',
              entityId: section3._id,
              data: {
                index: 1
              }
            })
            .expect(httpStatus.OK);

          expect(res3.body.draftData.sortableId).to.be.eq(2.5);
        });

        it('should update draft surveyItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'update',
              entityId: surveyItem._id,
              data: {
                type: 'question',
                textLimit: 100,
                required: true,
                customAnswer: true,
                minAnswers: 1,
                maxAnswers: 3,
                hide: true
              }
            })
            .expect(httpStatus.OK);
          expect(res.body.hide).to.be.eq(true);
          expect(res.body.type).to.be.eq('question');
          expect(res.body.textLimit).to.be.eq(100);
          expect(res.body.required).to.be.eq(true);
          expect(res.body.customAnswer).to.be.eq(true);
          expect(res.body.minAnswers).to.be.eq(1);
          expect(res.body.maxAnswers).to.be.eq(3);
        });

        it('should update draft surveyItem sortableId', async () => {
          const survey = await surveyFactory({ team, company });

          const surveySection = await surveySectionFactory({ survey });

          const [
            item1,
            item2,
            item3
          ] = await Promise.all([
            surveyItemFactory({ team, company, survey, sortableId: 0, surveySection }),
            surveyItemFactory({ team, company, survey, sortableId: 1, surveySection }),
            surveyItemFactory({ team, company, survey, sortableId: 2, surveySection })
          ]);

          const res1 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'update',
              entityId: item1._id,
              data: {
                index: 2
              }
            })
            .expect(httpStatus.OK);

          expect(res1.body.draftData.sortableId).to.be.eq(3);

          const res2 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'update',
              entityId: item2._id,
              data: {
                index: 0
              }
            })
            .expect(httpStatus.OK);

          expect(res2.body.draftData.sortableId).to.be.eq(0);

          const res3 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'update',
              entityId: item3._id,
              data: {
                index: 1
              }
            })
            .expect(httpStatus.OK);

          expect(res3.body.draftData.sortableId).to.be.eq(2.5);
        });

        it('should update draft contentItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'update',
              entityId: contentItem._id,
              data: {
                title: { en: 'New Title' }
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.title.en).to.be.eq('New Title');
        });

        it('should update draft contentItem sortableId', async () => {
          const survey = await surveyFactory({ team, company });

          const surveyItem = await surveyItemFactory({ team, company, survey });

          const [
            item1,
            item2,
            item3
          ] = await Promise.all([
            contentItemFactory({ team, company, survey, sortableId: 0, surveyItem }),
            contentItemFactory({ team, company, survey, sortableId: 1, surveyItem }),
            contentItemFactory({ team, company, survey, sortableId: 2, surveyItem })
          ]);

          const res1 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'update',
              entityId: item1._id,
              data: {
                index: 2
              }
            })
            .expect(httpStatus.OK);

          expect(res1.body.draftData.sortableId).to.be.eq(3);

          const res2 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'update',
              entityId: item2._id,
              data: {
                index: 0
              }
            })
            .expect(httpStatus.OK);

          expect(res2.body.draftData.sortableId).to.be.eq(0);

          const res3 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'update',
              entityId: item3._id,
              data: {
                index: 1
              }
            })
            .expect(httpStatus.OK);

          expect(res3.body.draftData.sortableId).to.be.eq(2.5);
        });

        xit('should update draft contentItem startPage', async () => {

        });

        xit('should update draft contentItem endPage', async () => {

        });

        it('should update question phone number with language', async () => {
          const survey = await surveyFactory({ team, company });

          const surveySection = await surveySectionFactory({ survey, team, company });

          await surveyItemFactory({
            team,
            company,
            survey,
            surveySection,
            question: phoneQuestion._id
          });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: phoneQuestion._id,
              data: {
                type: 'text',
                defaultCode: 'EN'
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.defaultCode).to.be.eq('EN');
        });

        it('should thumbs type switched to checkboxes', async () => {
          const survey = await surveyFactory({ team, company });

          const thumbsQuestion = await questionFactory({
            type: 'thumbs',
            team,
            company,
            fromCaption: {
              en: 'Yes'
            },
            toCaption: {
              en: 'No'
            }
          });

          await surveyItemFactory({
            team,
            company,
            survey,
            surveySection,
            question: thumbsQuestion._id
          });


          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: thumbsQuestion._id,
              data: {
                type: 'checkboxes'
              }
            })
            .expect(httpStatus.OK);

          expect(res.body).to.be.an('object');
          expect(res.body.type).to.be.eq('checkboxes');
          expect(res.body.questionItems).to.be.an('array');
          expect(res.body.questionItems).to.have.length(2);
          expect(res.body.questionItems[0].name.en).to.be.eq('Yes');
          expect(res.body.questionItems[1].name.en).to.be.eq('No');
        });

        it('should checkboxes type switched to multipleChoice', async () => {
          const survey = await surveyFactory({ team, company });

          const checkboxesQuestion = await questionFactory({
            type: 'checkboxes',
            team,
            company
          });

          await surveyItemFactory({
            team,
            company,
            survey,
            surveySection,
            question: checkboxesQuestion._id
          });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: checkboxesQuestion._id,
              data: {
                type: 'multipleChoice'
              }
            })
            .expect(httpStatus.OK);

          expect(res.body).to.be.an('object');
          expect(res.body.type).to.be.eq('multipleChoice');
        });

        it('should checkboxes type switched to dropdown', async () => {
          const survey = await surveyFactory({ team, company });

          const checkboxesQuestion = await questionFactory({
            type: 'checkboxes',
            team,
            company
          });

          await surveyItemFactory({
            team,
            company,
            survey,
            surveySection,
            question: checkboxesQuestion._id
          });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: checkboxesQuestion._id,
              data: {
                type: 'dropdown'
              }
            })
            .expect(httpStatus.OK);

          expect(res.body).to.be.an('object');
          expect(res.body.type).to.be.eq('dropdown');
        });

        it('should thumbs and flow item types switched to checkboxes', async () => {
          const survey = await surveyFactory({ team, company });

          const thumbsQuestion = await questionFactory({
            type: 'thumbs',
            team,
            company,
            fromCaption: {
              en: 'Yes'
            },
            toCaption: {
              en: 'No'
            }
          });
          const surveySection = await surveySectionFactory({ survey, team, company });

          const surveyItem = await surveyItemFactory({
            team,
            company,
            survey,
            question: thumbsQuestion._id,
            surveySection
          });

          const flowLogic = await flowLogicFactory({
            team,
            company,
            survey,
            surveyItem: surveyItem._id
          });

          await flowItemFactory({
            team,
            company,
            flowLogic,
            value: 'Yes',
            questionType: 'thumbs',
            condition: 'equal'
          });

          await flowItemFactory({
            team,
            company,
            flowLogic,
            value: 'No',
            questionType: 'thumbs'
          });

          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: thumbsQuestion._id,
              data: {
                type: 'checkboxes'
              }
            })
            .expect(httpStatus.OK);

          const items = await FlowItem.model.find({ flowLogic });

          expect(items).to.have.lengthOf(2);
          expect(items.every(item => item.questionItems.length === 1)).to.be.eq(true);
          expect(items.every(item => item.questionType === 'checkboxes')).to.be.eq(true);
        });

        it('should checkboxes and flow item types switched to dropdown', async () => {
          const survey = await surveyFactory({ team, company });

          const checkboxesQuestion = await questionFactory({
            type: 'checkboxes',
            team,
            company
          });

          const checkboxesItem = await questionItemFactory({ question: checkboxesQuestion._id });

          const surveySection = await surveySectionFactory({ survey, team, company });

          const surveyItem = await surveyItemFactory({
            team,
            company,
            survey,
            question: checkboxesQuestion._id,
            surveySection
          });

          const flowLogic = await flowLogicFactory({
            team,
            company,
            survey,
            surveyItem: surveyItem._id
          });

          await flowItemFactory({
            team,
            company,
            flowLogic,
            questionItems: [checkboxesItem._id],
            questionType: 'checkboxes',
            condition: 'equal'
          });

          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: checkboxesQuestion._id,
              data: {
                type: 'dropdown'
              }
            })
            .expect(httpStatus.OK);

          const items = await FlowItem.model.find({ flowLogic });

          expect(items).to.have.lengthOf(1);
          expect(items[0].questionItems).to.be.lengthOf(1);
          expect(items[0].questionType).to.be.eq('dropdown');
        });

        it('should return an error because checkboxes not change to thumbs', async () => {
          const survey = await surveyFactory({ team, company });

          const checkboxesQuestion = await questionFactory({
            type: 'checkboxes',
            team,
            company
          });

          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: checkboxesQuestion._id,
              data: {
                type: 'thumbs'
              }
            })
            .expect(httpStatus.BAD_REQUEST);
        });

        it('should checkboxes matrix type switched to multiple choice matrix', async () => {
          const survey = await surveyFactory({ team, company });

          const checkboxMatrixQuestion = await questionFactory({
            type: 'checkboxMatrix',
            team,
            company
          });

          await surveyItemFactory({
            team,
            company,
            survey,
            surveySection,
            question: checkboxMatrixQuestion._id
          });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: checkboxMatrixQuestion._id,
              data: {
                type: 'multipleChoiceMatrix'
              }
            })
            .expect(httpStatus.OK);

          expect(res.body).to.be.an('object');
          expect(res.body.type).to.be.eq('multipleChoiceMatrix');
        });

        it('should multiple choice matrix type switched to checkboxes matrix', async () => {
          const survey = await surveyFactory({ team, company });

          const multipleChoiceMatrixQuestion = await questionFactory({
            type: 'multipleChoiceMatrix',
            section: surveySection._id,
            team,
            company
          });

          await surveyItemFactory({
            team,
            company,
            survey,
            surveySection,
            question: multipleChoiceMatrixQuestion._id
          });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: multipleChoiceMatrixQuestion._id,
              data: {
                type: 'checkboxMatrix'
              }
            })
            .expect(httpStatus.OK);

          expect(res.body).to.be.an('object');
          expect(res.body.type).to.be.eq('checkboxMatrix');
        });

        it('should input email change to phone number', async () => {
          const survey = await surveyFactory({ team, company });

          const emailQuestion = await questionFactory({
            type: 'text',
            input: 'email',
            team,
            company
          });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: emailQuestion._id,
              data: {
                type: 'text',
                input: 'phone'
              }
            })
            .expect(httpStatus.OK);

          expect(res.body).to.be.an('object');
          expect(res.body.type).to.be.eq('text');
          expect(res.body.input).to.be.eq('phone');
        });

        it('should input number change to email', async () => {
          const survey = await surveyFactory({ team, company });

          const numberQuestion = await questionFactory({
            type: 'text',
            input: 'number',
            team,
            company
          });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: numberQuestion._id,
              data: {
                type: 'text',
                input: 'email'
              }
            })
            .expect(httpStatus.OK);

          expect(res.body).to.be.an('object');
          expect(res.body.type).to.be.eq('text');
          expect(res.body.input).to.be.eq('email');
        });

        it('should input email change to number', async () => {
          const survey = await surveyFactory({ team, company });

          const emailQuestion = await questionFactory({
            type: 'text',
            input: 'email',
            team,
            company
          });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: emailQuestion._id,
              data: {
                type: 'text',
                input: 'number'
              }
            })
            .expect(httpStatus.OK);

          expect(res.body).to.be.an('object');
          expect(res.body.type).to.be.eq('text');
          expect(res.body.input).to.be.eq('number');
        });

        it('should return an error because type not change to linearScale', async () => {
          const survey = await surveyFactory({ team, company });

          const checkboxesQuestion = await questionFactory({
            type: 'checkboxes',
            team,
            company
          });

          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: checkboxesQuestion._id,
              data: {
                type: 'linearScale'
              }
            })
            .expect(httpStatus.BAD_REQUEST);
        });

        it('should return an error because type not change to netPromoterScore', async () => {
          const survey = await surveyFactory({ team, company });

          const checkboxesQuestion = await questionFactory({
            type: 'checkboxes',
            team,
            company
          });

          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: checkboxesQuestion._id,
              data: {
                type: 'netPromoterScore'
              }
            })
            .expect(httpStatus.BAD_REQUEST);
        });

        it('should return an error because type not change to slider', async () => {
          const survey = await surveyFactory({ team, company });

          const checkboxesQuestion = await questionFactory({
            type: 'checkboxes',
            team,
            company
          });

          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: checkboxesQuestion._id,
              data: {
                type: 'slider'
              }
            })
            .expect(httpStatus.BAD_REQUEST);
        });

        it('should return an error because type not change to countryList', async () => {
          const survey = await surveyFactory({ team, company });

          const checkboxesQuestion = await questionFactory({
            type: 'checkboxes',
            team,
            company
          });

          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: checkboxesQuestion._id,
              data: {
                type: 'countryList'
              }
            })
            .expect(httpStatus.BAD_REQUEST);
        });

        it('should update draft question', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: question._id,
              data: {
                type: 'text',
                name: { de: 'New Name' }
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.type).to.be.eq('text');
          expect(res.body.name.de).to.be.eq('New Name');
        });

        it('should update net promoter score comments', async () => {
          const question = await questionFactory({
            company,
            team,
            type: 'netPromoterScore',
            textComment: false,
            detractorsComment: { en: 'detractorsComment' },
            passivesComment: { en: 'passivesComment' },
            promotersComment: { en: 'promotersComment' },
          });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: question._id,
              data: {
                type: 'netPromoterScore',
                textComment: true,
                detractorsComment: { en: 'detractorsCommentNew' },
                passivesComment: { en: 'passivesCommentNew' },
                promotersComment: { en: 'promotersCommentNew' }
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.textComment).to.be.eq(true);
          expect(res.body.detractorsComment.en).to.be.eq('detractorsCommentNew');
          expect(res.body.passivesComment.en).to.be.eq('passivesCommentNew');
          expect(res.body.promotersComment.en).to.be.eq('promotersCommentNew');
        });

        it('should update draft questionItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'questionItem',
              action: 'update',
              entityId: questionItem._id,
              data: {
                name: { de: 'New Name' }
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.name.de).to.be.eq('New Name');
        });

        it('should update draft questionItem sortableId', async () => {
          const survey = await surveyFactory({ team, company });

          const question = await questionFactory({ team, company, survey });

          const [
            item1,
            item2,
            item3
          ] = await Promise.all([
            questionItemFactory({ team, company, sortableId: 0, question }),
            questionItemFactory({ team, company, sortableId: 1, question }),
            questionItemFactory({ team, company, sortableId: 2, question })
          ]);

          const res1 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'questionItem',
              action: 'update',
              entityId: item1._id,
              data: {
                index: 2
              }
            })
            .expect(httpStatus.OK);

          expect(res1.body.draftData.sortableId).to.be.eq(3);

          const res2 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'questionItem',
              action: 'update',
              entityId: item2._id,
              data: {
                index: 0
              }
            })
            .expect(httpStatus.OK);

          expect(res2.body.draftData.sortableId).to.be.eq(0);

          const res3 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'questionItem',
              action: 'update',
              entityId: item3._id,
              data: {
                index: 1
              }
            })
            .expect(httpStatus.OK);

          expect(res3.body.draftData.sortableId).to.be.eq(2.5);
        });

        it('should update draft gridRow', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridRow',
              action: 'update',
              entityId: gridRow._id,
              data: {
                name: { de: 'New Name' }
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.name.de).to.be.eq('New Name');
        });

        it('should update draft gridRow sortableId', async () => {
          const survey = await surveyFactory({ team, company });

          const question = await questionFactory({ team, company, survey });

          const [
            item1,
            item2,
            item3
          ] = await Promise.all([
            gridRowFactory({ team, company, sortableId: 0, question }),
            gridRowFactory({ team, company, sortableId: 1, question }),
            gridRowFactory({ team, company, sortableId: 2, question })
          ]);

          const res1 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridRow',
              action: 'update',
              entityId: item1._id,
              data: {
                index: 2
              }
            })
            .expect(httpStatus.OK);

          expect(res1.body.draftData.sortableId).to.be.eq(3);

          const res2 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridRow',
              action: 'update',
              entityId: item2._id,
              data: {
                index: 0
              }
            })
            .expect(httpStatus.OK);

          expect(res2.body.draftData.sortableId).to.be.eq(0);

          const res3 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridRow',
              action: 'update',
              entityId: item3._id,
              data: {
                index: 1
              }
            })
            .expect(httpStatus.OK);

          expect(res3.body.draftData.sortableId).to.be.eq(2.5);
        });

        it('should update draft gridColumn', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridColumn',
              action: 'update',
              entityId: gridColumn._id,
              data: {
                name: { de: 'New Name' }
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.name.de).to.be.eq('New Name');
        });

        it('should update draft gridColumn sortableId', async () => {
          const survey = await surveyFactory({ team, company });

          const question = await questionFactory({ team, company, survey });

          const [
            item1,
            item2,
            item3
          ] = await Promise.all([
            gridColumnFactory({ team, company, sortableId: 0, question }),
            gridColumnFactory({ team, company, sortableId: 1, question }),
            gridColumnFactory({ team, company, sortableId: 2, question })
          ]);

          const res1 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridColumn',
              action: 'update',
              entityId: item1._id,
              data: {
                index: 2
              }
            })
            .expect(httpStatus.OK);

          expect(res1.body.draftData.sortableId).to.be.eq(3);

          const res2 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridColumn',
              action: 'update',
              entityId: item2._id,
              data: {
                index: 0
              }
            })
            .expect(httpStatus.OK);

          expect(res2.body.draftData.sortableId).to.be.eq(0);

          const res3 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridColumn',
              action: 'update',
              entityId: item3._id,
              data: {
                index: 1
              }
            })
            .expect(httpStatus.OK);

          expect(res3.body.draftData.sortableId).to.be.eq(2.5);
        });

        it('should update draft flowLogic', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowLogic',
              action: 'update',
              entityId: flowLogic._id,
              data: {
                method: 'some'
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.method).to.be.eq('some');
        });

        it('should update draft displayLogic', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'displayLogic',
              action: 'update',
              entityId: displayLogic._id,
              data: {
                method: 'some'
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.method).to.be.eq('some');
        });

        it('should update draft flowLogic sortableId', async () => {
          const survey = await surveyFactory({ team, company });

          const surveyItem = await surveyItemFactory({ team, company, survey });

          const [
            item1,
            item2,
            item3
          ] = await Promise.all([
            flowLogicFactory({ team, company, sortableId: 0, surveyItem }),
            flowLogicFactory({ team, company, sortableId: 1, surveyItem }),
            flowLogicFactory({ team, company, sortableId: 2, surveyItem })
          ]);

          const res1 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowLogic',
              action: 'update',
              entityId: item1._id,
              data: {
                index: 2
              }
            })
            .expect(httpStatus.OK);

          expect(res1.body.draftData.sortableId).to.be.eq(3);

          const res2 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowLogic',
              action: 'update',
              entityId: item2._id,
              data: {
                index: 0
              }
            })
            .expect(httpStatus.OK);

          expect(res2.body.draftData.sortableId).to.be.eq(0);

          const res3 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowLogic',
              action: 'update',
              entityId: item3._id,
              data: {
                index: 1
              }
            })
            .expect(httpStatus.OK);

          expect(res3.body.draftData.sortableId).to.be.eq(2.5);
        });

        it('should update draft flowItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowItem',
              action: 'update',
              entityId: flowItem._id,
              data: {
                flowLogic: flowLogic._id,
                questionType: 'text',
                condition: 'equal',
                value: 'value',
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.condition).to.be.eq('equal');
        });

        it('should update draft endPage flowItem', async () => {
          const endPage = await contentItemFactory({ team, company, survey });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowItem',
              action: 'update',
              entityId: flowItem._id,
              data: {
                endPage: endPage._id,
                questionType: 'endPage',
                condition: 'less',
                count: 5
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.condition).to.be.eq('less');
        });

        it('should not change linear scale in pulse', async () => {
          const pulse = await surveyFactory({ company, team, surveyType: 'pulse' });

          const pulseSurveyDriver = await pulseSurveyDriverFactory({ company, team, survey: pulse, name: 'driver' });

          const surveySection = await surveySectionFactory({
            survey: pulse,
            company,
            team,
            pulseSurveyDriver,
          });

          const question = await questionFactory({ team, company, type: 'linearScale', pulse: true });

          await surveyItemFactory({ company, team, question, surveySection, survey: pulse });

          const res = await agent
            .post(`/api/v1/drafts/${pulse._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: question._id,
              data: {
                linearScale: { from: 2, to: 10 },
                type: 'linearScale'
              }
            })
            .expect(httpStatus.OK);

          const { linearScale } = res.body.draftData;

          expect(linearScale).to.be.empty;
        });

        it('should not change data if LinearScale is Primary and user not Template Maker', async () => {
          const pulse = await surveyFactory({ company, team, surveyType: 'pulse', primaryPulse: true });

          const pulseSurveyDriver = await pulseSurveyDriverFactory({
            company,
            team,
            survey: pulse,
            name: 'driver',
            primaryPulse: true
          });

          const surveySection = await surveySectionFactory({
            survey: pulse,
            company,
            team,
            pulseSurveyDriver,
            primaryPulse: true
          });

          const question = await questionFactory({
            team,
            company,
            type: 'linearScale',
            pulse: true,
            primaryPulse: true
          });

          await surveyItemFactory({
            company,
            team,
            question,
            surveySection,
            survey: pulse,
            primaryPulse: true
          });

          const res = await agent
            .post(`/api/v1/drafts/${pulse._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: question._id,
              data: {
                linearScale: { fromCaption: { en: 'Bad' }, toCaption: { en: 'Good' }, icon: 'smiley' },
                name: { en: 'Question' },
                type: 'linearScale'
              }
            })
            .expect(httpStatus.OK);

          const { draftData } = res.body;

          expect(draftData).to.not.have.any.keys('linearScale', 'name');
        });

        it('should not change data if NPS is Primary and user not Template Maker', async () => {
          const pulse = await surveyFactory({ company, team, surveyType: 'pulse', primaryPulse: true });

          const pulseSurveyDriver = await pulseSurveyDriverFactory({
            company,
            team,
            survey: pulse,
            name: 'driver',
            primaryPulse: true
          });

          const surveySection = await surveySectionFactory({
            survey: pulse,
            company,
            team,
            pulseSurveyDriver,
            primaryPulse: true
          });

          const question = await questionFactory({
            team,
            company,
            type: 'netPromoterScore',
            pulse: true,
            primaryPulse: true
          });

          await surveyItemFactory({
            company,
            team,
            question,
            surveySection,
            survey: pulse,
            primaryPulse: true
          });

          const res = await agent
            .post(`/api/v1/drafts/${pulse._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: question._id,
              data: {
                linearScale: { fromCaption: { en: 'Bad' }, toCaption: { en: 'Good' } },
                name: { en: 'Question' },
                promotersPlaceholder: { en: 'Positive' },
                passivesPlaceholder: { en: 'Passive' },
                detractorsPlaceholder: { en: 'Negative' },
                type: 'netPromoterScore'
              }
            })
            .expect(httpStatus.OK);

          const { draftData } = res.body;

          expect(draftData).to.not.have.any.keys('linearScale', 'name', 'promotersPlaceholder', 'passivesPlaceholder', 'detractorsPlaceholder');
        });

        it('should not change name if driver is Primary and user not Template Make', async () => {
          const pulse = await surveyFactory({ company, team, surveyType: 'pulse', primaryPulse: true });

          const pulseSurveyDriver = await pulseSurveyDriverFactory({
            company,
            team,
            survey: pulse,
            name: 'driver',
            primaryPulse: true
          });

          const res = await agent
            .post(`/api/v1/drafts/${pulse._id}`)
            .send({
              entity: 'pulseSurveyDriver',
              action: 'update',
              entityId: pulseSurveyDriver._id,
              data: {
                name: 'New name for driver'
              }
            })
            .expect(httpStatus.OK);

          const { draftData } = res.body;

          expect(draftData).to.not.include.any.keys('name');
        });

        it('should not change name if subdriver is Primary and user not Template Make', async () => {
          const pulse = await surveyFactory({ company, team, surveyType: 'pulse', primaryPulse: true });

          const pulseSurveyDriver = await pulseSurveyDriverFactory({
            company,
            team,
            survey: pulse,
            name: 'driver',
            primaryPulse: true
          });

          const surveySection = await surveySectionFactory({
            survey: pulse,
            company,
            team,
            pulseSurveyDriver,
            primaryPulse: true,
            name: { en: 'Subdriver' }
          });

          const res = await agent
            .post(`/api/v1/drafts/${pulse._id}`)
            .send({
              entity: 'surveySection',
              action: 'update',
              entityId: surveySection._id,
              data: {
                name: { en: 'New name for subdriver' }
              }
            })
            .expect(httpStatus.OK);

          console.log(res.body);

          const { draftData } = res.body;

          expect(draftData).to.not.include.any.keys('name');
        });

        it('should update draft contentItemElement', async () => {
          const contentItemElement = await contentItemElementFactory({ company });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItemElement',
              action: 'update',
              entityId: contentItemElement._id,
              data: {
                link: 'newLink'
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.link).to.be.eq('newLink');
        });
      });

      describe('remove', () => {
        it('should remove draft surveySection', async () => {
          const [
            item1,
            item2,
            item3
          ] = await Promise.all([
            surveyItemFactory({
              company,
              team,
              surveySection,
              question,
              draftData: { surveySection: surveySection._id.toString() }
            }),
            surveyItemFactory({
              company,
              team,
              surveySection,
              question,
              draftData: { surveySection: surveySection._id.toString() }
            }),
            surveyItemFactory({
              company,
              team,
              surveySection,
              question
            }),
          ]);

          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveySection',
              action: 'remove',
              entityId: surveySection._id
            })
            .expect(httpStatus.OK);

          const [
            reloadSection,
            trash1,
            trash2,
            trash3,
          ] = await Promise.all([
            SurveySection.model.findById(surveySection._id),
            Trash.model.findOne({ surveyItem: item1 }).lean(),
            Trash.model.findOne({ surveyItem: item2 }).lean(),
            Trash.model.findOne({ surveyItem: item3 }).lean()
          ]);

          expect(reloadSection.draftRemove).to.be.eq(true);
          expect(trash1.stage).to.be.eq('inDraft');
          expect(trash1.draft.toString()).to.be.eq(survey._id.toString());
          expect(trash2.stage).to.be.eq('inDraft');
          expect(trash2.draft.toString()).to.be.eq(survey._id.toString());
          expect(trash3.stage).to.be.eq('inDraft');
          expect(trash3.draft.toString()).to.be.eq(survey._id.toString());
        });

        xit('should set correct sortableId to other sections after remove', async () => {

        });

        it('should remove draft surveyItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'remove',
              entityId: surveyItem._id
            })
            .expect(httpStatus.OK);

          const [
            doc,
            trash
          ] = await Promise.all([
            SurveyItem.model.findById(surveyItem._id),
            Trash.model.findOne({ surveyItem: surveyItem._id })
          ]);

          expect(res.body.toString()).to.be.eq(trash._id.toString());
          expect(doc.draftRemove).to.be.eq(true);
          expect(doc.inTrash).to.be.eq(false);
          expect(trash.stage).to.be.eq('inDraft');
          expect(trash.draft.toString()).to.be.eq(survey._id.toString());
        });

        xit('should set correct sortableId to other surveyItems after remove', async () => {

        });

        it('should remove draft contentItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'remove',
              entityId: contentItem._id
            })
            .expect(httpStatus.OK);

          const [
            doc,
            trash
          ] = await Promise.all([
            ContentItem.model.findById(contentItem._id),
            Trash.model.findOne({ contentItem: contentItem._id })
          ]);

          expect(res.body.toString()).to.be.eq(trash._id.toString());
          expect(doc.draftRemove).to.be.eq(true);
          expect(doc.inTrash).to.be.eq(false);
          expect(trash.stage).to.be.eq('inDraft');
          expect(trash.draft.toString()).to.be.eq(survey._id.toString());
        });

        xit('should set correct sortableId to other contents after remove', async () => {

        });

        xit('should remove surveyItem, after remove last content of if', async () => {

        });

        xit('should set correct sortableId to other questions after remove', async () => {

        });

        it('should remove draft questionItem', async () => {
          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              surveyItemId: surveyItem._id,
              entity: 'questionItem',
              action: 'remove',
              entityId: questionItem._id
            })
            .expect(httpStatus.OK);

          const doc = await QuestionItem.model.findById(questionItem._id);

          expect(doc.draftRemove).to.be.eq(true);
          expect(doc.inTrash).to.be.eq(false);
        });

        xit('should set correct sortableId to other questionItems after remove', async () => {

        });

        it('should remove draft gridRow', async () => {
          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              surveyItemId: surveyItem._id,
              entity: 'gridRow',
              action: 'remove',
              entityId: gridRow._id
            })
            .expect(httpStatus.OK);

          const doc = await QuestionItem.model.findById(questionItem._id);

          expect(doc.draftRemove).to.be.eq(true);
          expect(doc.inTrash).to.be.eq(false);
        });

        xit('should set correct sortableId to other gridRows after remove', async () => {

        });

        it('should remove draft gridColumn', async () => {
          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              surveyItemId: surveyItem._id,
              entity: 'gridColumn',
              action: 'remove',
              entityId: gridColumn._id
            })
            .expect(httpStatus.OK);

          const doc = await QuestionItem.model.findById(questionItem._id);

          expect(doc.draftRemove).to.be.eq(true);
          expect(doc.inTrash).to.be.eq(false);
        });

        xit('should set correct sortableId to other gridColumns after remove', async () => {

        });

        it('should remove draft flowLogic', async () => {
          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowLogic',
              action: 'remove',
              entityId: flowLogic._id
            })
            .expect(httpStatus.NO_CONTENT);

          // reload doc
          const doc = await FlowLogic.model.findById(flowLogic._id);

          expect(doc.draftRemove).to.be.eq(true);
        });

        it('should remove draft displayLogic', async () => {
          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'displayLogic',
              action: 'remove',
              entityId: displayLogic._id
            })
            .expect(httpStatus.NO_CONTENT);

          // reload doc
          const doc = await DisplayLogic.model.findById(displayLogic._id);

          expect(doc.draftRemove).to.be.eq(true);
        });

        it('should remove draft flowItem', async () => {
          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowItem',
              action: 'remove',
              entityId: flowItem._id
            })
            .expect(httpStatus.NO_CONTENT);

          // reload doc
          const doc = await FlowItem.model.findById(flowItem._id);

          expect(doc.draftRemove).to.be.eq(true);
        });

        xit('should set correct sortableId to other flowItems after remove', async () => {

        });

        it('should remove draft endPage flowItem', async () => {
          const flowItem = await flowItemFactory({ team, company, survey });

          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowItem',
              action: 'remove',
              entityId: flowItem._id
            })
            .expect(httpStatus.NO_CONTENT);

          // reload doc
          const doc = await FlowItem.model.findById(flowItem._id);

          expect(doc.draftRemove).to.be.eq(true);
        });

        it('should not remove if subDriver is Primary and user not Template Make', async () => {
          const pulse = await surveyFactory({ company, team, surveyType: 'pulse', primaryPulse: true });

          const pulseSurveyDriver = await pulseSurveyDriverFactory({
            company,
            team,
            survey: pulse,
            name: 'driver',
            primaryPulse: true
          });

          const surveySection = await surveySectionFactory({
            survey: pulse,
            company,
            team,
            pulseSurveyDriver,
            primaryPulse: true,
            name: { en: 'Subdriver' }
          });

          await agent
            .post(`/api/v1/drafts/${pulse._id}`)
            .send({
              entity: 'surveySection',
              action: 'remove',
              entityId: surveySection._id
            })
            .expect(httpStatus.NOT_FOUND);
        });

        it('should not remove if question is Primary and user not Template Make', async () => {
          const pulse = await surveyFactory({ company, team, surveyType: 'pulse', primaryPulse: true });

          const pulseSurveyDriver = await pulseSurveyDriverFactory({
            company,
            team,
            survey: pulse,
            name: 'driver',
            primaryPulse: true
          });

          const surveySection = await surveySectionFactory({
            survey: pulse,
            company,
            team,
            pulseSurveyDriver,
            primaryPulse: true,
            name: { en: 'Subdriver' }
          });

          const question = await questionFactory({
            team,
            company,
            type: 'netPromoterScore',
            pulse: true,
            primaryPulse: true
          });

          const surveyItem = await surveyItemFactory({
            company,
            team,
            question,
            surveySection,
            survey: pulse,
            primaryPulse: true
          });

          await agent
            .post(`/api/v1/drafts/${pulse._id}`)
            .send({
              entity: 'surveyItem',
              action: 'remove',
              entityId: surveyItem._id
            })
            .expect(httpStatus.NOT_FOUND);
        });

        it('should remove driver and related entities', async () => {
          const survey = await surveyFactory({ team, company, surveyType: 'pulse' });

          const pulseSurveyDriver = await pulseSurveyDriverFactory({ team, company, survey });

          const surveySection = await surveySectionFactory({
            team,
            company,
            survey,
            pulseSurveyDriver
          });

          const surveyItem = await surveyItemFactory({ team, company, survey, surveySection });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'pulseSurveyDriver',
              action: 'remove',
              entityId: pulseSurveyDriver._id
            })
            .expect(httpStatus.OK);

          expect(res.body._id.toString()).to.be.eq(survey._id.toString());
          expect(res.body.surveySections.length).to.be.eq(0);

          const [
            reloadPulseSurveyDriver,
            reloadSurveySection,
            reloadSurveyItem
          ] = await Promise.all([
            PulseSurveyDriver.model
              .findOne({ _id: pulseSurveyDriver._id })
              .lean(),
            SurveySection.model
              .findOne({ _id: surveySection._id })
              .lean(),
            SurveyItem.model
              .findOne({ _id: surveyItem._id })
              .lean()
          ]);

          expect(reloadPulseSurveyDriver.draftRemove).to.be.eq(true);
          expect(reloadSurveySection.draftRemove).to.be.eq(true);
          expect(reloadSurveyItem.draftRemove).to.be.eq(true);
        });

        it('should remove contentItemElement', async () => {
          const contentItemElement = await contentItemElementFactory({ company });

          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItemElement',
              action: 'remove',
              entityId: contentItemElement._id
            })
            .expect(httpStatus.OK);

          const doc = await ContentItemElement.model.findById(contentItemElement._id);

          expect(doc.draftRemove).to.be.eq(true);
        });
      });
    });

    describe('Attempt to remove last item in question', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email
          });

        question = await questionFactory({ team, company, inDraft: true });
        [
          survey,
          questionItem,
          gridRow,
          gridColumn,
        ] = await Promise.all([
          surveyFactory({ team, company, inDraft: true }),
          questionItemFactory({ team, company, inDraft: true, question: question._id }),
          gridRowFactory({ team, company, inDraft: true, question: question._id }),
          gridColumnFactory({ team, company, inDraft: true, question: question._id }),
        ]);
      });

      describe('remove', () => {
        it('should response bad request for deleting last question item', async () => {
          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'questionItem',
              action: 'remove',
              entityId: questionItem._id
            })
            .expect(httpStatus.BAD_REQUEST);
        });

        it('should response bad request for deleting last grid row item', async () => {
          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridRow',
              action: 'remove',
              entityId: gridRow._id
            })
            .expect(httpStatus.BAD_REQUEST);
        });

        it('should response bad request for deleting last grid column item', async () => {
          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridColumn',
              action: 'remove',
              entityId: gridColumn._id
            })
            .expect(httpStatus.BAD_REQUEST);
        });
      });
    });

    describe('As Team User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email2
          });

        question = await questionFactory({ team, company, inDraft: true });
        survey = await surveyFactory({ team, company, inDraft: true });

        [
          questionItem,
          gridRow,
          gridColumn,
          surveySection,
          surveyItem,
          contentItem,
          flowLogic,
          flowItem
        ] = await Promise.all([
          questionItemFactory({ team, company, inDraft: true, question: question._id }),
          gridRowFactory({ team, company, inDraft: true, question: question._id }),
          gridColumnFactory({ team, company, inDraft: true, question: question._id }),
          surveySectionFactory({ team, company, survey, inDraft: true }),
          surveyItemFactory({ team, company, survey, inDraft: true }),
          contentItemFactory({ team, company }),
          flowLogicFactory({ team, company, inDraft: true }),
          flowItemFactory({ team, company, survey, inDraft: true }),
          questionItemFactory({ team, company, inDraft: true, question: question._id }),
          gridRowFactory({ team, company, inDraft: true, question: question._id }),
          gridColumnFactory({ team, company, inDraft: true, question: question._id }),
        ]);
      });

      describe('create', () => {
        it('should return error because doc is not found', async () => {
          await agent
            .post(`/api/v1/drafts/${flowItem._id}`)
            .send({
              entity: 'flowItem',
              action: 'remove',
              entityId: flowItem._id
            })
            .expect(httpStatus.NOT_FOUND);
        });

        it('should return error if user hasn\'t permission', async () => {
          const survey = await surveyFactory({});

          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowItem',
              action: 'remove',
              entityId: flowItem._id
            })
            .expect(httpStatus.FORBIDDEN);
        });

        it('should create number question', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'create',
              type: 'question',
              data: {
                type: 'question',
                surveySection: surveySection._id,
                question: 'text',
                questionInput: 'number'
              }
            })
            .expect(httpStatus.CREATED);

          const { question } = res.body;

          expect(question.input).to.be.eq('number');
          expect(question.linearScale.from).to.be.eq(null);
          expect(question.linearScale.to).to.be.eq(null);
        });

        it('should create thumbs question', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'create',
              type: 'question',
              data: {
                type: 'question',
                surveySection: surveySection._id,
                question: 'thumbs',
                fromCaption: { en: 'fromCaption' },
                toCaption: { en: 'toCaption' }
              }
            })
            .expect(httpStatus.CREATED);

          const { question } = res.body;

          expect(question.type).to.be.eq('thumbs');
          expect(question.linearScale.fromCaption.en).to.be.eq('fromCaption');
          expect(question.linearScale.toCaption.en).to.be.eq('toCaption');
        });

        it('should create slider question', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'create',
              type: 'question',
              data: {
                type: 'question',
                surveySection: surveySection._id,
                question: 'slider',
              }
            })
            .expect(httpStatus.CREATED);

          const { question } = res.body;

          expect(question.type).to.be.eq('slider');
          expect(question.linearScale.from).to.be.eq(0);
          expect(question.linearScale.to).to.be.eq(100);
        });

        it('should create draft surveySection', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveySection',
              action: 'create',
              data: {
                index: 1,
                survey: survey._id
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.survey).to.be.eq(survey._id.toString());
          expect(res.body.sortableId).to.be.eq(1);
          expect(res.body.inDraft).to.be.eq(true);
        });

        xit('should set correct sortable id to new section', async () => {

        });

        it('should create draft surveyItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'create',
              data: {
                type: 'question',
                surveySection: surveySection._id,
                question: 'dropdown'
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.survey).to.be.eq(survey._id.toString());
          expect(res.body.surveySection).to.be.eq(surveySection._id.toString());
          expect(res.body.sortableId).to.be.eq(3);
          expect(res.body.inDraft).to.be.eq(true);
          expect(res.body.question).to.be.an('object');
          expect(res.body.question.questionItems.length).to.be.eq(1);
        });

        it('should create draft surveyItem with correct sortableId', async () => {
          const surveySection = await surveySectionFactory({ company, team, survey });

          await Promise.all([
            surveyItemFactory({ company, team, surveySection, sortableId: 0 }),
            surveyItemFactory({ company, team, surveySection, sortableId: 1 }),
          ]);

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'create',
              data: {
                type: 'question',
                surveySection: surveySection._id,
                question: 'dropdown',
                index: 0
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.survey).to.be.eq(survey._id.toString());
          expect(res.body.surveySection).to.be.eq(surveySection._id.toString());
          expect(res.body.sortableId).to.be.eq(0.5);
          expect(res.body.inDraft).to.be.eq(true);
          expect(res.body.question).to.be.an('object');
          expect(res.body.question.questionItems.length).to.be.eq(1);
        });

        it('should create draft surveyItem and clone general question', async () => {
          const generalQuestion = await questionFactory({ team, company, general: true });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'create',
              data: {
                type: 'question',
                surveySection: surveySection._id,
                question: generalQuestion._id
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.survey).to.be.eq(survey._id.toString());
          expect(res.body.surveySection).to.be.eq(surveySection._id.toString());
          expect(res.body.sortableId).to.be.eq(4);
          expect(res.body.inDraft).to.be.eq(true);

          const { question } = res.body;

          expect(question).to.be.an('object');
          expect(question._id.toString()).to.not.eq(generalQuestion._id.toString());
          expect(question.team.toString()).to.be.eq(teamUser.currentTeam._id.toString());
          expect(question.company.toString()).to.be.eq(teamUser.company._id.toString());
          expect(question.createdBy.toString()).to.be.eq(teamUser._id.toString());
          expect(question.updatedBy.toString()).to.be.eq(teamUser._id.toString());
          expect(question.type).to.be.eq(generalQuestion.type);
        });

        xit('should set correct sortable id to new surveyItem', async () => {

        });

        it('should create draft contentItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'create',
              data: {
                survey: survey._id,
                surveyItem: surveyItem._id,
                surveyItemSortableId: 0,
                index: 0,
                type: 'content',
                contentType: 'text',
                text: { en: 'Hello' },
                surveyItemType: 'contents'
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.inDraft).to.be.eq(true);
          expect(res.body.surveyItem.toString()).to.be.eq(surveyItem._id.toString());
          expect(res.body.sortableId).to.be.eq(0);
          expect(res.body.type).to.be.eq('content');
          expect(res.body.contentType).to.be.eq('text');
          expect(res.body.text.en).to.be.eq('Hello');
        });

        it('should set correct sortable id to new contentItem to Top position', async () => {
          const survey = await surveyFactory({ team, company, inDraft: true });
          const surveyItem = await surveyItemFactory({ team, company, survey });
          await Promise.all([
            contentItemFactory({ team, company, survey, sortableId: 0, surveyItem }),
            contentItemFactory({ team, company, survey, sortableId: 1, surveyItem }),
            contentItemFactory({ team, company, survey, sortableId: 2, surveyItem })
          ]);

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'create',
              data: {
                index: -1,
                survey: survey._id,
                surveyItem: surveyItem._id,
                type: 'content',
                contentType: 'socialIcons'
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.surveyItem.toString()).to.be.eq(surveyItem._id.toString());
          expect(res.body.sortableId).to.be.eq(-1);
        });

        it('should set correct sortable id to new surveyItem to Top position', async () => {
          const survey = await surveyFactory({ team, company, inDraft: true });
          const surveySection = await surveySectionFactory({ team, company, survey });

          Promise.all([
            surveyItemFactory({ team, company, survey, surveySection, sortableId: 0 }),
            surveyItemFactory({ team, company, survey, surveySection, sortableId: 1 }),
            surveyItemFactory({ team, company, survey, surveySection, sortableId: 2 })
          ]);


          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'create',
              data: {
                type: 'question',
                surveySection: surveySection._id,
                question: 'dropdown',
                index: -1
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.sortableId).to.be.eq(-1);
        });

        it('should set correct sortable id to new startPage if passed a new index position for it', async () => {
          const survey = await surveyFactory({ team, company, inDraft: true });
          const surveyItem = await surveyItemFactory({ team, company, survey });
          await Promise.all([
            contentItemFactory({ team, company, survey, sortableId: 0, surveyItem, type: 'startPage' }),
            contentItemFactory({ team, company, survey, sortableId: 1, surveyItem, type: 'startPage' }),
            contentItemFactory({ team, company, survey, sortableId: 2, surveyItem, type: 'startPage' })
          ]);

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'create',
              data: {
                contentType: 'contentImage',
                dataType: 'unsplash',
                dataUrl: 'dataUrl',
                survey: survey._id,
                index: 1,
                type: 'startPage'
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.sortableId).to.be.eq(1.5);
        });

        it('should set correct sortable id to new endPage if passed a new index position for it', async () => {
          const survey = await surveyFactory({ team, company, inDraft: true });
          const surveyItem = await surveyItemFactory({ team, company, survey });
          await Promise.all([
            contentItemFactory({ team, company, survey, sortableId: 0, surveyItem, type: 'endPage' }),
            contentItemFactory({ team, company, survey, sortableId: 1, surveyItem, type: 'endPage' }),
            contentItemFactory({ team, company, survey, sortableId: 2, surveyItem, type: 'endPage' })
          ]);

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'create',
              data: {
                contentType: 'contentImage',
                dataType: 'unsplash',
                dataUrl: 'dataUrl',
                survey: survey._id,
                index: 1,
                type: 'endPage'
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.sortableId).to.be.eq(1.5);
        });

        it('should set correct sortable id to new startPage as a regular next item', async () => {
          const survey = await surveyFactory({ team, company, inDraft: true });
          const surveyItem = await surveyItemFactory({ team, company, survey });
          await Promise.all([
            contentItemFactory({ team, company, survey, sortableId: 0, surveyItem, type: 'startPage' }),
            contentItemFactory({ team, company, survey, sortableId: 1, surveyItem, type: 'startPage' }),
            contentItemFactory({ team, company, survey, sortableId: 2, surveyItem, type: 'startPage' })
          ]);

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'create',
              data: {
                contentType: 'contentImage',
                dataType: 'unsplash',
                dataUrl: 'dataUrl',
                survey: survey._id,
                type: 'startPage'
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.sortableId).to.be.eq(3);
        });

        it('should set correct sortable id to new endPage as a regular next item', async () => {
          const survey = await surveyFactory({ team, company, inDraft: true });
          const surveyItem = await surveyItemFactory({ team, company, survey });
          await Promise.all([
            contentItemFactory({ team, company, survey, sortableId: 0, surveyItem, type: 'endPage' }),
            contentItemFactory({ team, company, survey, sortableId: 1, surveyItem, type: 'endPage' }),
            contentItemFactory({ team, company, survey, sortableId: 2, surveyItem, type: 'endPage' })
          ]);

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'create',
              data: {
                contentType: 'contentImage',
                dataType: 'unsplash',
                dataUrl: 'dataUrl',
                survey: survey._id,
                type: 'endPage'
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.sortableId).to.be.eq(3);
        });

        xit('should create draft surveyItem with question', async () => {

        });

        xit('should create draft surveyItem with question with questionItems', async () => {

        });

        xit('should create draft surveyItem with question with gridItems', async () => {

        });

        it('should create draft questionItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'questionItem',
              action: 'create',
              data: {
                question: question._id,
                index: 0
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.question).to.be.eq(question._id.toString());
          expect(res.body.inDraft).to.be.eq(true);
        });

        it('should create draft gridRow', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridRow',
              action: 'create',
              data: {
                question: question._id,
                index: 0
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.question).to.be.eq(question._id.toString());
          expect(res.body.inDraft).to.be.eq(true);
        });

        it('should create draft gridColumn', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridColumn',
              action: 'create',
              data: {
                question: question._id,
                index: 0
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.question).to.be.eq(question._id.toString());
          expect(res.body.inDraft).to.be.eq(true);
        });

        it('should create draft flowLogic', async () => {
          const surveyItem = await surveyItemFactory({ team, company });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowLogic',
              action: 'create',
              data: {
                surveyItem: surveyItem._id,
                method: 'every',
                action: 'endSurvey',
                questionType: 'text',
                index: 0
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.surveyItem.toString()).to.be.eq(surveyItem._id.toString());
          expect(res.body.method).to.be.eq('every');
          expect(res.body.action).to.be.eq('endSurvey');
          expect(res.body.inDraft).to.be.eq(true);

          const [flowItem] = res.body.flowItems;

          expect(flowItem.inDraft).to.be.eq(true);
          expect(flowItem.questionType).to.be.eq('text');
          expect(flowItem.flowLogic.toString()).to.be.eq(res.body._id.toString());
        });

        it('should create draft flowItem', async () => {
          const flowLogic = await flowLogicFactory({ team, company });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowItem',
              action: 'create',
              data: {
                flowLogic: flowLogic._id,
                questionType: 'text',
                condition: 'equal',
                value: 'value',
                index: 0
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.flowLogic.toString()).to.be.eq(flowLogic._id.toString());
          expect(res.body.questionType).to.be.eq('text');
          expect(res.body.condition).to.be.eq('equal');
          expect(res.body.value).to.be.eq('value');
        });

        it('should create draft endPage flowItem', async () => {
          const endPage = await contentItemFactory({ team, company, contentItem });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowItem',
              action: 'create',
              data: {
                endPage: endPage._id,
                questionType: 'endPage',
                condition: 'range',
                range: {
                  from: 1,
                  to: 2
                }
              }
            })
            .expect(httpStatus.CREATED);

          expect(res.body.questionType).to.be.eq('endPage');
          expect(res.body.condition).to.be.eq('range');
          expect(res.body.range.from).to.be.eq(1);
          expect(res.body.range.to).to.be.eq(2);
        });

        xit('should create draft surveyItem with content', async () => {

        });
      });

      describe('update', () => {
        it('should update draft surveySection', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveySection',
              action: 'update',
              entityId: surveySection._id,
              data: {
                name: { de: 'New Name' },
                translationLockName: { de: true },
                description: { de: 'New Description' },
                translationLockDescription: { de: true },
                displaySingle: true,
                hide: true
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.hide).to.be.eq(true);
          expect(res.body.name.de).to.be.eq('New Name');
          expect(res.body.translationLockName.de).to.be.eq(true);
          expect(res.body.description.de).to.be.eq('New Description');
          expect(res.body.translationLockDescription.de).to.be.eq(true);
          expect(res.body.displaySingle).to.be.eq(true);
        });

        it('should update draft surveySection sortableId', async () => {
          const survey = await surveyFactory({ team, company });

          const [
            section1,
            section2,
            section3
          ] = await Promise.all([
            surveySectionFactory({ team, company, survey, sortableId: 0 }),
            surveySectionFactory({ team, company, survey, sortableId: 1 }),
            surveySectionFactory({ team, company, survey, sortableId: 2 })
          ]);

          const res1 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveySection',
              action: 'update',
              entityId: section1._id,
              data: {
                index: 2
              }
            })
            .expect(httpStatus.OK);

          expect(res1.body.draftData.sortableId).to.be.eq(3);

          const res2 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveySection',
              action: 'update',
              entityId: section2._id,
              data: {
                index: 0
              }
            })
            .expect(httpStatus.OK);

          expect(res2.body.draftData.sortableId).to.be.eq(0);

          const res3 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveySection',
              action: 'update',
              entityId: section3._id,
              data: {
                index: 1
              }
            })
            .expect(httpStatus.OK);

          expect(res3.body.draftData.sortableId).to.be.eq(2.5);
        });

        it('should update draft surveyItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'update',
              entityId: surveyItem._id,
              data: {
                type: 'question',
                textLimit: 100,
                required: true,
                customAnswer: true,
                minAnswers: 1,
                maxAnswers: 3,
                hide: true
              }
            })
            .expect(httpStatus.OK);
          expect(res.body.hide).to.be.eq(true);
          expect(res.body.type).to.be.eq('question');
          expect(res.body.textLimit).to.be.eq(100);
          expect(res.body.required).to.be.eq(true);
          expect(res.body.customAnswer).to.be.eq(true);
          expect(res.body.minAnswers).to.be.eq(1);
          expect(res.body.maxAnswers).to.be.eq(3);
        });

        it('should update draft surveyItem sortableId', async () => {
          const survey = await surveyFactory({ team, company });

          const surveySection = await surveySectionFactory({ survey });

          const [
            item1,
            item2,
            item3
          ] = await Promise.all([
            surveyItemFactory({ team, company, survey, sortableId: 0, surveySection }),
            surveyItemFactory({ team, company, survey, sortableId: 1, surveySection }),
            surveyItemFactory({ team, company, survey, sortableId: 2, surveySection })
          ]);

          const res1 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'update',
              entityId: item1._id,
              data: {
                index: 2
              }
            })
            .expect(httpStatus.OK);

          expect(res1.body.draftData.sortableId).to.be.eq(3);

          const res2 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'update',
              entityId: item2._id,
              data: {
                index: 0
              }
            })
            .expect(httpStatus.OK);

          expect(res2.body.draftData.sortableId).to.be.eq(0);

          const res3 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'update',
              entityId: item3._id,
              data: {
                index: 1
              }
            })
            .expect(httpStatus.OK);

          expect(res3.body.draftData.sortableId).to.be.eq(2.5);
        });

        it('should update draft contentItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'update',
              entityId: contentItem._id,
              data: {
                title: { en: 'New Title' }
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.title.en).to.be.eq('New Title');
        });

        it('should update draft contentItem sortableId', async () => {
          const survey = await surveyFactory({ team, company });

          const surveyItem = await surveyItemFactory({ team, company, survey });

          const [
            item1,
            item2,
            item3
          ] = await Promise.all([
            contentItemFactory({ team, company, survey, sortableId: 0, surveyItem }),
            contentItemFactory({ team, company, survey, sortableId: 1, surveyItem }),
            contentItemFactory({ team, company, survey, sortableId: 2, surveyItem })
          ]);

          const res1 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'update',
              entityId: item1._id,
              data: {
                index: 2
              }
            })
            .expect(httpStatus.OK);

          expect(res1.body.draftData.sortableId).to.be.eq(3);

          const res2 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'update',
              entityId: item2._id,
              data: {
                index: 0
              }
            })
            .expect(httpStatus.OK);

          expect(res2.body.draftData.sortableId).to.be.eq(0);

          const res3 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'update',
              entityId: item3._id,
              data: {
                index: 1
              }
            })
            .expect(httpStatus.OK);

          expect(res3.body.draftData.sortableId).to.be.eq(2.5);
        });

        xit('should update draft contentItem startPage', async () => {

        });

        xit('should update draft contentItem endPage', async () => {

        });

        it('should update draft question', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: question._id,
              data: {
                type: 'text',
                name: { de: 'New Name' }
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.type).to.be.eq('text');
          expect(res.body.name.de).to.be.eq('New Name');
        });

        it('should update draft questionItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'questionItem',
              action: 'update',
              entityId: questionItem._id,
              data: {
                name: { de: 'New Name' }
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.name.de).to.be.eq('New Name');
        });

        it('should update draft questionItem sortableId', async () => {
          const survey = await surveyFactory({ team, company });

          const question = await questionFactory({ team, company, survey });

          const [
            item1,
            item2,
            item3
          ] = await Promise.all([
            questionItemFactory({ team, company, sortableId: 0, question }),
            questionItemFactory({ team, company, sortableId: 1, question }),
            questionItemFactory({ team, company, sortableId: 2, question })
          ]);

          const res1 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'questionItem',
              action: 'update',
              entityId: item1._id,
              data: {
                index: 2
              }
            })
            .expect(httpStatus.OK);

          expect(res1.body.draftData.sortableId).to.be.eq(3);

          const res2 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'questionItem',
              action: 'update',
              entityId: item2._id,
              data: {
                index: 0
              }
            })
            .expect(httpStatus.OK);

          expect(res2.body.draftData.sortableId).to.be.eq(0);

          const res3 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'questionItem',
              action: 'update',
              entityId: item3._id,
              data: {
                index: 1
              }
            })
            .expect(httpStatus.OK);

          expect(res3.body.draftData.sortableId).to.be.eq(2.5);
        });

        it('should update draft gridRow', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridRow',
              action: 'update',
              entityId: gridRow._id,
              data: {
                name: { de: 'New Name' }
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.name.de).to.be.eq('New Name');
        });

        it('should update draft gridRow sortableId', async () => {
          const survey = await surveyFactory({ team, company });

          const question = await questionFactory({ team, company, survey });

          const [
            item1,
            item2,
            item3
          ] = await Promise.all([
            gridRowFactory({ team, company, sortableId: 0, question }),
            gridRowFactory({ team, company, sortableId: 1, question }),
            gridRowFactory({ team, company, sortableId: 2, question })
          ]);

          const res1 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridRow',
              action: 'update',
              entityId: item1._id,
              data: {
                index: 2
              }
            })
            .expect(httpStatus.OK);

          expect(res1.body.draftData.sortableId).to.be.eq(3);

          const res2 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridRow',
              action: 'update',
              entityId: item2._id,
              data: {
                index: 0
              }
            })
            .expect(httpStatus.OK);

          expect(res2.body.draftData.sortableId).to.be.eq(0);

          const res3 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridRow',
              action: 'update',
              entityId: item3._id,
              data: {
                index: 1
              }
            })
            .expect(httpStatus.OK);

          expect(res3.body.draftData.sortableId).to.be.eq(2.5);
        });

        it('should update draft gridColumn', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridColumn',
              action: 'update',
              entityId: gridColumn._id,
              data: {
                name: { de: 'New Name' }
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.name.de).to.be.eq('New Name');
        });

        it('should update draft gridColumn sortableId', async () => {
          const survey = await surveyFactory({ team, company });

          const question = await questionFactory({ team, company, survey });

          const [
            item1,
            item2,
            item3
          ] = await Promise.all([
            gridColumnFactory({ team, company, sortableId: 0, question }),
            gridColumnFactory({ team, company, sortableId: 1, question }),
            gridColumnFactory({ team, company, sortableId: 2, question })
          ]);

          const res1 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridColumn',
              action: 'update',
              entityId: item1._id,
              data: {
                index: 2
              }
            })
            .expect(httpStatus.OK);

          expect(res1.body.draftData.sortableId).to.be.eq(3);

          const res2 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridColumn',
              action: 'update',
              entityId: item2._id,
              data: {
                index: 0
              }
            })
            .expect(httpStatus.OK);

          expect(res2.body.draftData.sortableId).to.be.eq(0);

          const res3 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'gridColumn',
              action: 'update',
              entityId: item3._id,
              data: {
                index: 1
              }
            })
            .expect(httpStatus.OK);

          expect(res3.body.draftData.sortableId).to.be.eq(2.5);
        });

        it('should update draft flowLogic', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowLogic',
              action: 'update',
              entityId: flowLogic._id,
              data: {
                method: 'some'
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.method).to.be.eq('some');
        });

        it('should update draft flowLogic sortableId', async () => {
          const survey = await surveyFactory({ team, company });

          const surveyItem = await surveyItemFactory({ team, company, survey });

          const [
            item1,
            item2,
            item3
          ] = await Promise.all([
            flowLogicFactory({ team, company, sortableId: 0, surveyItem }),
            flowLogicFactory({ team, company, sortableId: 1, surveyItem }),
            flowLogicFactory({ team, company, sortableId: 2, surveyItem })
          ]);

          const res1 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowLogic',
              action: 'update',
              entityId: item1._id,
              data: {
                index: 2
              }
            })
            .expect(httpStatus.OK);

          expect(res1.body.draftData.sortableId).to.be.eq(3);

          const res2 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowLogic',
              action: 'update',
              entityId: item2._id,
              data: {
                index: 0
              }
            })
            .expect(httpStatus.OK);

          expect(res2.body.draftData.sortableId).to.be.eq(0);

          const res3 = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowLogic',
              action: 'update',
              entityId: item3._id,
              data: {
                index: 1
              }
            })
            .expect(httpStatus.OK);

          expect(res3.body.draftData.sortableId).to.be.eq(2.5);
        });

        it('should update draft flowItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowItem',
              action: 'update',
              entityId: flowItem._id,
              data: {
                flowLogic: flowLogic._id,
                questionType: 'text',
                condition: 'equal',
                value: 'value',
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.condition).to.be.eq('equal');
        });

        it('should update draft endPage flowItem', async () => {
          const endPage = await contentItemFactory({ team, company, contentItem });

          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowItem',
              action: 'update',
              entityId: flowItem._id,
              data: {
                endPage: endPage._id,
                questionType: 'endPage',
                condition: 'less',
                count: 5
              }
            })
            .expect(httpStatus.OK);

          expect(res.body.condition).to.be.eq('less');
        });
      });

      describe('remove', () => {
        it('should remove draft surveySection', async () => {
          const [
            item1,
            item2,
            item3
          ] = await Promise.all([
            surveyItemFactory({
              company,
              team,
              surveySection,
              question,
              draftData: { surveySection: surveySection._id.toString() }
            }),
            surveyItemFactory({
              company,
              team,
              surveySection,
              question,
              draftData: { surveySection: surveySection._id.toString() }
            }),
            surveyItemFactory({
              company,
              team,
              surveySection,
              question
            }),
          ]);

          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveySection',
              action: 'remove',
              entityId: surveySection._id
            })
            .expect(httpStatus.OK);

          const [
            reloadSection,
            trash1,
            trash2,
            trash3,
          ] = await Promise.all([
            SurveySection.model.findById(surveySection._id),
            Trash.model.findOne({ surveyItem: item1 }).lean(),
            Trash.model.findOne({ surveyItem: item2 }).lean(),
            Trash.model.findOne({ surveyItem: item3 }).lean()
          ]);

          expect(reloadSection.draftRemove).to.be.eq(true);
          expect(trash1.stage).to.be.eq('inDraft');
          expect(trash1.draft.toString()).to.be.eq(survey._id.toString());
          expect(trash2.stage).to.be.eq('inDraft');
          expect(trash2.draft.toString()).to.be.eq(survey._id.toString());
          expect(trash3.stage).to.be.eq('inDraft');
          expect(trash3.draft.toString()).to.be.eq(survey._id.toString());
        });

        xit('should set correct sortableId to other sections after remove', async () => {

        });

        it('should remove draft surveyItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'surveyItem',
              action: 'remove',
              entityId: surveyItem._id
            })
            .expect(httpStatus.OK);

          const [
            doc,
            trash
          ] = await Promise.all([
            SurveyItem.model.findById(surveyItem._id),
            Trash.model.findOne({ surveyItem: surveyItem._id })
          ]);

          expect(res.body.toString()).to.be.eq(trash._id.toString());
          expect(doc.draftRemove).to.be.eq(true);
          expect(doc.inTrash).to.be.eq(false);
          expect(trash.stage).to.be.eq('inDraft');
          expect(trash.draft.toString()).to.be.eq(survey._id.toString());
        });

        xit('should set correct sortableId to other surveyItems after remove', async () => {

        });

        it('should remove draft contentItem', async () => {
          const res = await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'contentItem',
              action: 'remove',
              entityId: contentItem._id
            })
            .expect(httpStatus.OK);

          const [
            doc,
            trash
          ] = await Promise.all([
            ContentItem.model.findById(contentItem._id),
            Trash.model.findOne({ contentItem: contentItem._id })
          ]);

          expect(res.body.toString()).to.be.eq(trash._id.toString());
          expect(doc.draftRemove).to.be.eq(true);
          expect(doc.inTrash).to.be.eq(false);
          expect(trash.stage).to.be.eq('inDraft');
          expect(trash.draft.toString()).to.be.eq(survey._id.toString());
        });

        xit('should set correct sortableId to other contents after remove', async () => {

        });

        xit('should remove surveyItem, after remove last content of if', async () => {

        });

        xit('should set correct sortableId to other questions after remove', async () => {

        });

        it('should remove draft questionItem', async () => {
          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              surveyItemId: surveyItem._id,
              entity: 'questionItem',
              action: 'remove',
              entityId: questionItem._id
            })
            .expect(httpStatus.OK);

          const doc = await QuestionItem.model.findById(questionItem._id);

          expect(doc.draftRemove).to.be.eq(true);
          expect(doc.inTrash).to.be.eq(false);
        });

        xit('should set correct sortableId to other questionItems after remove', async () => {

        });

        it('should remove draft gridRow', async () => {
          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              surveyItemId: surveyItem._id,
              entity: 'gridRow',
              action: 'remove',
              entityId: gridRow._id
            })
            .expect(httpStatus.OK);

          const doc = await QuestionItem.model.findById(questionItem._id);

          expect(doc.draftRemove).to.be.eq(true);
          expect(doc.inTrash).to.be.eq(false);
        });

        xit('should set correct sortableId to other gridRows after remove', async () => {

        });

        it('should remove draft gridColumn', async () => {
          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              surveyItemId: surveyItem._id,
              entity: 'gridColumn',
              action: 'remove',
              entityId: gridColumn._id
            })
            .expect(httpStatus.OK);

          const doc = await QuestionItem.model.findById(questionItem._id);

          expect(doc.draftRemove).to.be.eq(true);
          expect(doc.inTrash).to.be.eq(false);
        });

        xit('should set correct sortableId to other gridColumns after remove', async () => {

        });

        it('should remove draft flowLogic', async () => {
          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowLogic',
              action: 'remove',
              entityId: flowLogic._id
            })
            .expect(httpStatus.NO_CONTENT);

          // reload doc
          const doc = await FlowLogic.model.findById(flowLogic._id);

          expect(doc.draftRemove).to.be.eq(true);
        });

        it('should remove draft flowItem', async () => {
          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowItem',
              action: 'remove',
              entityId: flowItem._id
            })
            .expect(httpStatus.NO_CONTENT);

          // reload doc
          const doc = await FlowItem.model.findById(flowItem._id);

          expect(doc.draftRemove).to.be.eq(true);
        });

        xit('should set correct sortableId to other flowItems after remove', async () => {

        });

        it('should remove draft endPage flowItem', async () => {
          const flowItem = await flowItemFactory({ team, company, survey });

          await agent
            .post(`/api/v1/drafts/${survey._id}`)
            .send({
              entity: 'flowItem',
              action: 'remove',
              entityId: flowItem._id
            })
            .expect(httpStatus.NO_CONTENT);

          // reload doc
          const doc = await FlowItem.model.findById(flowItem._id);

          expect(doc.draftRemove).to.be.eq(true);
        });
      });
    });

    describe('As Template Maker', () => {
      const agent = request.agent(app);

      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email3
          });
      });

      describe('update', () => {
        it('should not change linear scale in pulse', async () => {
          const pulse = await surveyFactory({ company, team, surveyType: 'pulse' });

          const pulseSurveyDriver = await pulseSurveyDriverFactory({ company, team, survey: pulse, name: 'driver' });

          const surveySection = await surveySectionFactory({
            survey: pulse,
            company,
            team,
            pulseSurveyDriver,
          });

          const question = await questionFactory({ team, company, type: 'linearScale', pulse: true });

          await surveyItemFactory({ company, team, question, surveySection, survey: pulse });

          const res = await agent
            .post(`/api/v1/drafts/${pulse._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: question._id,
              data: {
                linearScale: { from: 2, to: 10 },
                type: 'linearScale'
              }
            })
            .expect(httpStatus.OK);

          const { linearScale } = res.body.draftData;

          expect(linearScale).to.be.empty;
        });

        it('should change data if LinearScale is Primary and user Template Maker', async () => {
          const pulse = await surveyFactory({ company, team, surveyType: 'pulse', primaryPulse: true });

          const pulseSurveyDriver = await pulseSurveyDriverFactory({
            company,
            team,
            survey: pulse,
            name: 'driver',
            primaryPulse: true
          });

          const surveySection = await surveySectionFactory({
            survey: pulse,
            company,
            team,
            pulseSurveyDriver,
            primaryPulse: true
          });

          const question = await questionFactory({
            team,
            company,
            type: 'linearScale',
            pulse: true,
            primaryPulse: true
          });

          await surveyItemFactory({
            company,
            team,
            question,
            surveySection,
            survey: pulse,
            primaryPulse: true
          });

          const res = await agent
            .post(`/api/v1/drafts/${pulse._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: question._id,
              data: {
                name: { en: 'Question' },
                linearScale: { fromCaption: { en: 'Bad' }, toCaption: { en: 'Good' }, icon: 'smiley' },
                type: 'linearScale'
              }
            })
            .expect(httpStatus.OK);

          const { linearScale, name } = res.body.draftData;

          expect(linearScale.fromCaption.en).to.be.eq('Bad');
          expect(linearScale.toCaption.en).to.be.eq('Good');
          expect(linearScale.icon).to.be.eq('smiley');
          expect(name.en).to.be.eq('Question');
        });

        it('should change data if NPS is Primary and user Template Maker', async () => {
          const pulse = await surveyFactory({ company, team, surveyType: 'pulse', primaryPulse: true });

          const pulseSurveyDriver = await pulseSurveyDriverFactory({
            company,
            team,
            survey: pulse,
            name: 'driver',
            primaryPulse: true
          });

          const surveySection = await surveySectionFactory({
            survey: pulse,
            company,
            team,
            pulseSurveyDriver,
            primaryPulse: true
          });

          const question = await questionFactory({
            team,
            company,
            type: 'netPromoterScore',
            pulse: true,
            primaryPulse: true
          });

          await surveyItemFactory({
            company,
            team,
            question,
            surveySection,
            survey: pulse,
            primaryPulse: true
          });

          const res = await agent
            .post(`/api/v1/drafts/${pulse._id}`)
            .send({
              entity: 'question',
              action: 'update',
              entityId: question._id,
              data: {
                linearScale: { fromCaption: { en: 'Bad' }, toCaption: { en: 'Good' } },
                name: { en: 'Question' },
                promotersPlaceholder: { en: 'Positive' },
                passivesPlaceholder: { en: 'Passive' },
                detractorsPlaceholder: { en: 'Negative' },
                type: 'netPromoterScore'
              }
            })
            .expect(httpStatus.OK);

          const {
            linearScale,
            name,
            promotersPlaceholder,
            passivesPlaceholder,
            detractorsPlaceholder
          } = res.body.draftData;

          expect(linearScale.fromCaption.en).to.be.eq('Bad');
          expect(linearScale.toCaption.en).to.be.eq('Good');
          expect(name.en).to.be.eq('Question');
          expect(promotersPlaceholder.en).to.be.eq('Positive');
          expect(passivesPlaceholder.en).to.be.eq('Passive');
          expect(detractorsPlaceholder.en).to.be.eq('Negative');
        });

        it('should change name if driver is Primary and user Template Make', async () => {
          const pulse = await surveyFactory({ company, team, surveyType: 'pulse', primaryPulse: true });

          const pulseSurveyDriver = await pulseSurveyDriverFactory({
            company,
            team,
            survey: pulse,
            name: 'driver',
            primaryPulse: true
          });

          const res = await agent
            .post(`/api/v1/drafts/${pulse._id}`)
            .send({
              entity: 'pulseSurveyDriver',
              action: 'update',
              entityId: pulseSurveyDriver._id,
              data: {
                name: 'New name for driver'
              }
            })
            .expect(httpStatus.OK);

          const { name } = res.body.draftData;

          expect(name).to.be.eq('New name for driver');
        });

        it('should change name if subdriver is Primary and user Template Make', async () => {
          const pulse = await surveyFactory({ company, team, surveyType: 'pulse', primaryPulse: true });

          const pulseSurveyDriver = await pulseSurveyDriverFactory({
            company,
            team,
            survey: pulse,
            name: 'driver',
            primaryPulse: true
          });

          const surveySection = await surveySectionFactory({
            survey: pulse,
            company,
            team,
            pulseSurveyDriver,
            primaryPulse: true,
            name: { en: 'Subdriver' }
          });

          const res = await agent
            .post(`/api/v1/drafts/${pulse._id}`)
            .send({
              entity: 'surveySection',
              action: 'update',
              entityId: surveySection._id,
              data: {
                name: { en: 'New name for subdriver' }
              }
            })
            .expect(httpStatus.OK);

          const { name } = res.body.draftData;

          expect(name.en).to.not.include.any.keys('New name for subdriver');
        });
      });

      describe('remove', () => {
        it('should remove if subdriver is Primary and user is Template Make', async () => {
          const pulse = await surveyFactory({ company, team, surveyType: 'pulse', primaryPulse: true });

          const pulseSurveyDriver = await pulseSurveyDriverFactory({
            company,
            team,
            survey: pulse,
            name: 'driver',
            primaryPulse: true
          });

          const surveySection = await surveySectionFactory({
            survey: pulse,
            company,
            team,
            pulseSurveyDriver,
            primaryPulse: true,
            name: { en: 'Subdriver' }
          });

          await agent
            .post(`/api/v1/drafts/${pulse._id}`)
            .send({
              entity: 'surveySection',
              action: 'remove',
              entityId: surveySection._id
            })
            .expect(httpStatus.OK);
        });

        it('should remove if quesiton is Primary and user is Template Make', async () => {
          const pulse = await surveyFactory({ company, team, surveyType: 'pulse', primaryPulse: true });

          const pulseSurveyDriver = await pulseSurveyDriverFactory({
            company,
            team,
            survey: pulse,
            name: 'driver',
            primaryPulse: true
          });

          const surveySection = await surveySectionFactory({
            survey: pulse,
            company,
            team,
            pulseSurveyDriver,
            primaryPulse: true,
            name: { en: 'Subdriver' }
          });

          const question = await questionFactory({
            team,
            company,
            type: 'netPromoterScore',
            pulse: true,
            primaryPulse: true
          });

          const surveyItem = await surveyItemFactory({
            company,
            team,
            question,
            surveySection,
            survey: pulse,
            primaryPulse: true
          });

          await agent
            .post(`/api/v1/drafts/${pulse._id}`)
            .send({
              entity: 'surveyItem',
              action: 'remove',
              entityId: surveyItem._id
            })
            .expect(httpStatus.OK);
        });
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post(`/api/v1/drafts/${team._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});

