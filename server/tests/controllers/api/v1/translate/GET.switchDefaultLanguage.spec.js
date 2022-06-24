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

let team;
let company;
let survey;
let surveySection;
let question;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create Power User
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const user = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user, team, company });
}

describe('## GET /api/v1/translation/:id/switch', () => {
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


        survey = await surveyFactory({
          team,
          inDraft: true,
          name: { en: 'name', de: 'de name translated before' },
          description: { en: 'description' },
          footer: { text: { en: 'text' }, active: true },
          translation: { en: true, de: true },
          defaultLanguage: 'en'
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
      });

      it('should translate survey and all related entities', async () => {
        const res = await agent
          .get(`/api/v1/translation/${survey._id}/switch`)
          .query({ lang: 'de' })
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(survey._id.toString());

        const reloadSurvey = res.body;
        const [reloadSurveySection] = reloadSurvey.surveySections;
        const reloadQuestion = reloadSurveySection.surveyItems[0].question;
        const [reloadQuestionItem] = reloadQuestion.questionItems;
        const [reloadGridRow] = reloadQuestion.gridRows;
        const [reloadGridColumn] = reloadQuestion.gridColumns;

        expect(reloadSurvey.name.de).to.be.eq('de name translated before');
        expect(reloadSurvey.description.de).to.be.eq('translated to de');
        expect(reloadSurvey.footer.text.de).to.be.eq('translated to de');

        expect(reloadSurveySection.name.de).to.be.eq('translated to de');
        expect(reloadSurveySection.description.de).to.be.eq('translated to de');

        expect(reloadQuestion.name.de).to.be.eq('translated to de');
        expect(reloadQuestion.description.de).to.be.eq('translated to de');
        expect(reloadQuestion.placeholder.de).to.be.eq('translated to de');
        expect(reloadQuestion.linearScale.fromCaption.de).to.be.eq('translated to de');
        expect(reloadQuestion.linearScale.toCaption.de).to.be.eq('translated to de');

        expect(reloadQuestionItem.name.de).to.be.eq('translated to de');
        expect(reloadQuestionItem.quizResultText.de).to.be.eq('translated to de');

        expect(reloadGridRow.name.de).to.be.eq('translated to de');
        expect(reloadGridColumn.name.de).to.be.eq('translated to de');
      });

      it('should return error on attempt to switch default language', async () => {
        const survey = await surveyFactory({ team, company });

        await agent
          .get(`/api/v1/translation/${survey._id}/switch`)
          .query({ lang: 'en' })
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


        survey = await surveyFactory({
          team,
          inDraft: true,
          name: { en: 'name', de: 'de name translated before' },
          description: { en: 'description' },
          footer: { text: { en: 'text' }, active: true },
          translation: { en: true, de: true },
          defaultLanguage: 'en'
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
      });

      it('should translate survey and all related entities', async () => {
        const res = await agent
          .get(`/api/v1/translation/${survey._id}/switch`)
          .query({ lang: 'de' })
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(survey._id.toString());

        const reloadSurvey = res.body;
        const [reloadSurveySection] = reloadSurvey.surveySections;
        const reloadQuestion = reloadSurveySection.surveyItems[0].question;
        const [reloadQuestionItem] = reloadQuestion.questionItems;
        const [reloadGridRow] = reloadQuestion.gridRows;
        const [reloadGridColumn] = reloadQuestion.gridColumns;

        expect(reloadSurvey.name.de).to.be.eq('de name translated before');
        expect(reloadSurvey.description.de).to.be.eq('translated to de');
        expect(reloadSurvey.footer.text.de).to.be.eq('translated to de');

        expect(reloadSurveySection.name.de).to.be.eq('translated to de');
        expect(reloadSurveySection.description.de).to.be.eq('translated to de');

        expect(reloadQuestion.name.de).to.be.eq('translated to de');
        expect(reloadQuestion.description.de).to.be.eq('translated to de');
        expect(reloadQuestion.placeholder.de).to.be.eq('translated to de');
        expect(reloadQuestion.linearScale.fromCaption.de).to.be.eq('translated to de');
        expect(reloadQuestion.linearScale.toCaption.de).to.be.eq('translated to de');

        expect(reloadQuestionItem.name.de).to.be.eq('translated to de');
        expect(reloadQuestionItem.quizResultText.de).to.be.eq('translated to de');

        expect(reloadGridRow.name.de).to.be.eq('translated to de');
        expect(reloadGridColumn.name.de).to.be.eq('translated to de');
      });

      it('should return error on attempt to switch default language', async () => {
        survey = await surveyFactory({ team, company });

        await agent
          .get(`/api/v1/translation/${survey._id}/switch`)
          .query({ lang: 'en' })
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
