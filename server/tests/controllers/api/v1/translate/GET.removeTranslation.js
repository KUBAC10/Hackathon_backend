import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  userFactory,
  companyFactory,
  surveyFactory,
  teamFactory,
  surveySectionFactory,
  questionFactory,
  surveyItemFactory,
  questionItemFactory,
  gridRowFactory,
  gridColumnFactory, teamUserFactory
} from '../../../../factories';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'example1@email.com';
const email2 = 'example2@email.com';

let survey;
let surveySection;
let question;

async function makeTestData() {
  const company = await companyFactory({});
  const team = await teamFactory({ company });

  survey = await surveyFactory({
    team,
    inDraft: true,
    name: { en: 'name' },
    description: { en: 'description' },
    footer: { text: { en: 'text' }, active: true },
    translation: { en: true, de: true },
    defaultLanguage: 'de'
  });

  surveySection = await surveySectionFactory({
    team,
    survey,
    name: { en: 'name' },
    description: { en: 'description' },
  });

  question = await questionFactory({
    team,
    name: { en: 'name' },
    description: { en: 'description' },
    placeholder: { en: 'placeholder ' },
    fromCaption: { en: 'fromCaption' },
    toCaption: { en: 'toCaption' }
  });

  await Promise.all([
    questionItemFactory({
      team,
      question,
      name: { en: 'name' },
      quizResultText: { en: 'quizResultText' }
    }),
    gridRowFactory({ team, question, name: { en: 'name' } }),
    gridColumnFactory({ team, question, name: { en: 'name' } }),
  ]);

  await surveyItemFactory({
    team,
    survey,
    surveySection,
    question
  });

  // create Power User
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const user = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user, team, company });
}

describe('## GET /api/v1/translation/:id/remove', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('as Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email
          });
      });

      it('should translate survey and all related entities', async () => {
        const res = await agent
          .get(`/api/v1/translation/${survey._id}/remove`)
          .query({ lang: 'en' })
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(survey._id.toString());

        const reloadSurvey = res.body;
        const [reloadSurveySection] = reloadSurvey.surveySections;
        const reloadQuestion = reloadSurveySection.surveyItems[0].question;
        const [reloadQuestionItem] = reloadQuestion.questionItems;
        const [reloadGridRow] = reloadQuestion.gridRows;
        const [reloadGridColumn] = reloadQuestion.gridColumns;

        expect(reloadSurvey.name.en).to.be.eq(null);
        expect(reloadSurvey.description.en).to.be.eq(null);
        expect(reloadSurvey.footer.text.en).to.be.eq(null);

        expect(reloadSurveySection.name.en).to.be.eq(null);
        expect(reloadSurveySection.description.en).to.be.eq(null);

        expect(reloadQuestion.name.en).to.be.eq(null);
        expect(reloadQuestion.description.en).to.be.eq(null);
        expect(reloadQuestion.placeholder.en).to.be.eq(null);
        expect(reloadQuestion.linearScale.fromCaption.en).to.be.eq(null);
        expect(reloadQuestion.linearScale.toCaption.en).to.be.eq(null);

        expect(reloadQuestionItem.name.en).to.be.eq(null);
        expect(reloadQuestionItem.quizResultText.en).to.be.eq(null);

        expect(reloadGridRow.name.en).to.be.eq(null);
        expect(reloadGridColumn.name.en).to.be.eq(null);
      });

      it('should return error on attempt to remove default language translation', async () => {
        await agent
          .get(`/api/v1/translation/${survey._id}/remove`)
          .query({ lang: 'de' })
          .expect(httpStatus.UNPROCESSABLE_ENTITY);
      });
    });

    describe('as Team User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email2
          });
      });

      it('should translate survey and all related entities', async () => {
        const res = await agent
          .get(`/api/v1/translation/${survey._id}/remove`)
          .query({ lang: 'en' })
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(survey._id.toString());

        const reloadSurvey = res.body;
        const [reloadSurveySection] = reloadSurvey.surveySections;
        const reloadQuestion = reloadSurveySection.surveyItems[0].question;
        const [reloadQuestionItem] = reloadQuestion.questionItems;
        const [reloadGridRow] = reloadQuestion.gridRows;
        const [reloadGridColumn] = reloadQuestion.gridColumns;

        expect(reloadSurvey.name.en).to.be.eq(null);
        expect(reloadSurvey.description.en).to.be.eq(null);
        expect(reloadSurvey.footer.text.en).to.be.eq(null);

        expect(reloadSurveySection.name.en).to.be.eq(null);
        expect(reloadSurveySection.description.en).to.be.eq(null);

        expect(reloadQuestion.name.en).to.be.eq(null);
        expect(reloadQuestion.description.en).to.be.eq(null);
        expect(reloadQuestion.placeholder.en).to.be.eq(null);
        expect(reloadQuestion.linearScale.fromCaption.en).to.be.eq(null);
        expect(reloadQuestion.linearScale.toCaption.en).to.be.eq(null);

        expect(reloadQuestionItem.name.en).to.be.eq(null);
        expect(reloadQuestionItem.quizResultText.en).to.be.eq(null);

        expect(reloadGridRow.name.en).to.be.eq(null);
        expect(reloadGridColumn.name.en).to.be.eq(null);
      });

      it('should return error on attempt to remove default language translation', async () => {
        await agent
          .get(`/api/v1/translation/${survey._id}/remove`)
          .query({ lang: 'de' })
          .expect(httpStatus.UNPROCESSABLE_ENTITY);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post(`/api/v1/translation/${survey._id}`)
        .query({ lang: 'de' })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
