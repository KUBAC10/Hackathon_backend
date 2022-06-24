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
  gridColumnFactory,
  teamUserFactory,
  pulseSurveyDriverFactory,
  contentItemFactory,
  contentItemElementFactory
} from '../../../../factories';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'example1@email.com';
const email2 = 'example2@email.com';

let survey;
let primaryPulse;
let surveySection;
let primaryPulseSection;
let question;
let company;
let team;
let endPage;
let linkElement;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  survey = await surveyFactory({
    team,
    inDraft: true,
    name: { en: 'name' },
    description: { en: 'description' },
    footer: {
      text: { en: 'text' },
      content: { en: 'content' },
      active: true
    },
    references: {
      content: { en: 'content' }
    }
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
    toCaption: { en: 'toCaption' },
    quizCorrectText: { en: 'quizCorrectText' },
    quizIncorrectText: { en: 'quizIncorrectText' }
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

  primaryPulse = await surveyFactory({
    company,
    team,
    surveyType: 'pulse',
    primaryPulse: true,
    defaultLanguage: 'en'
  });

  const pulseSurveyDriver = await pulseSurveyDriverFactory({
    company,
    team,
    survey: primaryPulse,
    name: 'driver',
    primaryPulse: true
  });

  primaryPulseSection = await surveySectionFactory({
    survey: primaryPulse,
    company,
    team,
    pulseSurveyDriver,
    primaryPulse: true,
    name: {
      en: 'Subdriver',
      ru: 'Сабдарайвер'
    },
    description: {
      en: 'Some description about subdriver',
      ru: 'Некое описание о subdriver'
    }
  });

  const linearScale = await questionFactory({
    name: {
      en: 'Question linearScale',
      ru: 'Вопрос 1'
    },
    fromCaption: {
      en: 'Awful',
      ru: 'Плохо'
    },
    toCaption: {
      en: 'Awesome',
      ru: 'Хорошо'
    },
    team,
    company,
    type: 'linearScale',
    pulse: true,
    primaryPulse: true
  });

  const netPromoterScore = await questionFactory({
    name: {
      en: 'Question netPromoterScore',
      ru: 'NPS Вопрос'
    },
    fromCaption: {
      en: 'Awful',
      ru: 'Плохо'
    },
    toCaption: {
      en: 'Awesome',
      ru: 'Хорошо'
    },
    passivesComment: {
      en: 'What can we improve on?',
      ru: 'Что мы можем улучшить?'
    },
    passivesPlaceholder: {
      en: 'Passive',
      ru: 'Пассивный'
    },
    promotersComment: {
      en: 'What did you find most valuable?',
      ru: 'Что вы нашли наиболее ценным?'
    },
    promotersPlaceholder: {
      en: 'Promoters',
      ru: 'Положительный'
    },
    detractorsComment: {
      en: 'What was missing or disappointing in your experience with us?',
      ru: 'Что вам не хватало или что разочаровало в вашем опыте работы с нами?'
    },
    detractorsPlaceholder: {
      en: 'Detractors',
      ru: 'Недоброжелательный'
    },
    team,
    company,
    type: 'netPromoterScore',
    pulse: true,
    primaryPulse: true
  });

  await Promise.all([
    surveyItemFactory({
      company,
      team,
      question: linearScale,
      surveySection: primaryPulseSection,
      survey: primaryPulse,
      primaryPulse: true,
      sortableId: 1
    }),
    surveyItemFactory({
      company,
      team,
      question: netPromoterScore,
      surveySection: primaryPulseSection,
      survey: primaryPulse,
      primaryPulse: true,
      sortableId: 2
    })
  ]);

  endPage = await contentItemFactory({ company, survey, type: 'endPage' });

  linkElement = await contentItemElementFactory({
    company,
    contentItem: endPage,
    linkText: { en: 'Name', ru: 'Имя' }
  });
}

describe('## POST /api/v1/translation', () => {
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
          .post(`/api/v1/translation/${survey._id}`)
          .send({ lang: 'de' })
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(survey._id.toString());

        const reloadSurvey = res.body;
        const [reloadSurveySection] = reloadSurvey.surveySections;
        const reloadQuestion = reloadSurveySection.surveyItems[0].question;
        const [reloadQuestionItem] = reloadQuestion.questionItems;
        const [reloadGridRow] = reloadQuestion.gridRows;
        const [reloadGridColumn] = reloadQuestion.gridColumns;
        const [reloadEndPage] = reloadSurvey.endPages;

        expect(reloadSurvey.name.de).to.be.eq('translated to de');
        expect(reloadSurvey.description.de).to.be.eq('translated to de');
        expect(reloadSurvey.footer.text.de).to.be.eq('translated to de');
        expect(reloadSurvey.references.content.de).to.be.eq('translated to de');

        expect(reloadSurveySection.name.de).to.be.eq('translated to de');
        expect(reloadSurveySection.description.de).to.be.eq('translated to de');

        expect(reloadQuestion.name.de).to.be.eq('translated to de');
        expect(reloadQuestion.description.de).to.be.eq('translated to de');
        expect(reloadQuestion.placeholder.de).to.be.eq('translated to de');
        expect(reloadQuestion.quizCorrectText.de).to.be.eq('translated to de');
        expect(reloadQuestion.quizIncorrectText.de).to.be.eq('translated to de');
        expect(reloadQuestion.linearScale.fromCaption.de).to.be.eq('translated to de');
        expect(reloadQuestion.linearScale.toCaption.de).to.be.eq('translated to de');

        expect(reloadQuestionItem.name.de).to.be.eq('translated to de');
        expect(reloadQuestionItem.quizResultText.de).to.be.eq('translated to de');

        expect(reloadGridRow.name.de).to.be.eq('translated to de');
        expect(reloadGridColumn.name.de).to.be.eq('translated to de');

        expect(reloadEndPage).to.be.an('object');

        const [reloadContentItemElement] = reloadEndPage.contentItemElements;

        expect(reloadContentItemElement.linkText.de).to.be.eq('translated to de');
      });

      it('should translate pulse survey', async () => {
        const res = await agent
          .post('/api/v1/drafts')
          .send({
            customAnimation: true,
            defaultLanguage: 'en',
            name: 'Untitled Pulse',
            surveyType: 'pulse',
            type: 'survey'
          })
          .expect(httpStatus.CREATED);

        const { _id } = res.body;

        const translate = await agent
          .post(`/api/v1/translation/${_id}`)
          .send({ lang: 'ru' })
          .expect(httpStatus.OK);

        expect(translate.body._id.toString()).to.be.eq(_id.toString());

        const reloadSurvey = translate.body;
        const [reloadSurveySection] = reloadSurvey.surveySections;
        const linearScale = reloadSurveySection.surveyItems[0].question;
        const netPromoterScore = reloadSurveySection.surveyItems[1].question;

        expect(reloadSurvey.name.ru).to.be.eq('translated to ru');
        expect(reloadSurvey.description.ru).to.be.eq('translated to ru');

        expect(reloadSurveySection.name.ru).to.be.eq('Сабдарайвер');

        expect(linearScale.name.ru).to.be.eq('Вопрос 1');
        expect(linearScale.linearScale.fromCaption.ru).to.be.eq('Плохо');
        expect(linearScale.linearScale.toCaption.ru).to.be.eq('Хорошо');

        expect(netPromoterScore.name.ru).to.be.eq('NPS Вопрос');
        expect(netPromoterScore.linearScale.fromCaption.ru).to.be.eq('Плохо');
        expect(netPromoterScore.linearScale.toCaption.ru).to.be.eq('Хорошо');
        expect(netPromoterScore.detractorsComment.ru).to.be.eq('Что вам не хватало или что разочаровало в вашем опыте работы с нами?');
        expect(netPromoterScore.detractorsPlaceholder.ru).to.be.eq('Недоброжелательный');
        expect(netPromoterScore.passivesComment.ru).to.be.eq('Что мы можем улучшить?');
        expect(netPromoterScore.passivesPlaceholder.ru).to.be.eq('Пассивный');
        expect(netPromoterScore.promotersComment.ru).to.be.eq('Что вы нашли наиболее ценным?');
        expect(netPromoterScore.promotersPlaceholder.ru).to.be.eq('Положительный');
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
          .post(`/api/v1/translation/${survey._id}`)
          .send({ lang: 'de' })
          .expect(httpStatus.OK);

        expect(res.body._id.toString()).to.be.eq(survey._id.toString());

        const reloadSurvey = res.body;
        const [reloadSurveySection] = reloadSurvey.surveySections;
        const reloadQuestion = reloadSurveySection.surveyItems[0].question;
        const [reloadQuestionItem] = reloadQuestion.questionItems;
        const [reloadGridRow] = reloadQuestion.gridRows;
        const [reloadGridColumn] = reloadQuestion.gridColumns;
        const [reloadEndPage] = reloadSurvey.endPages;

        expect(reloadSurvey.name.de).to.be.eq('translated to de');
        expect(reloadSurvey.description.de).to.be.eq('translated to de');
        expect(reloadSurvey.footer.text.de).to.be.eq('translated to de');
        expect(reloadSurvey.references.content.de).to.be.eq('translated to de');

        expect(reloadSurveySection.name.de).to.be.eq('translated to de');
        expect(reloadSurveySection.description.de).to.be.eq('translated to de');

        expect(reloadQuestion.name.de).to.be.eq('translated to de');
        expect(reloadQuestion.description.de).to.be.eq('translated to de');
        expect(reloadQuestion.placeholder.de).to.be.eq('translated to de');
        expect(reloadQuestion.quizCorrectText.de).to.be.eq('translated to de');
        expect(reloadQuestion.quizIncorrectText.de).to.be.eq('translated to de');
        expect(reloadQuestion.linearScale.fromCaption.de).to.be.eq('translated to de');
        expect(reloadQuestion.linearScale.toCaption.de).to.be.eq('translated to de');

        expect(reloadQuestionItem.name.de).to.be.eq('translated to de');
        expect(reloadQuestionItem.quizResultText.de).to.be.eq('translated to de');

        expect(reloadGridRow.name.de).to.be.eq('translated to de');
        expect(reloadGridColumn.name.de).to.be.eq('translated to de');

        expect(reloadEndPage).to.be.an('object');

        const [reloadContentItemElement] = reloadEndPage.contentItemElements;

        expect(reloadContentItemElement.linkText.de).to.be.eq('translated to de');
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
