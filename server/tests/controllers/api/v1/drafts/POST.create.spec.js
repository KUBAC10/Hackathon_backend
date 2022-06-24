import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  userFactory,
  teamFactory,
  companyFactory,
  teamUserFactory,
  surveyFactory,
  pulseSurveyDriverFactory,
  surveySectionFactory,
  questionFactory,
  surveyItemFactory
} from '../../../../factories';

// models
import {
  SurveyTheme,
  Survey
} from '../../../../../models';

chai.config.includeStack = true;

let teamUser;
let team;
let company;
const email = 'test1@email.com';
const email2 = 'test2@email.com';
const email3 = 'test3@email.com';
const password = 'qwe123qwe';

async function makeTestData() {
  // create company and team
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create power User
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });

  // create Template maker user
  await userFactory({ email: email3, password, company, currentTeam: team, isTemplateMaker: true });
}

describe('## POST /api/v1/drafts', () => {
  describe('Authorized', () => {
    describe('Create pulse as not template maker without global pulse', () => {
      before(cleanData);

      before(makeTestData);

      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
      });

      it('should return bad request on pulse creating', async () => {
        await agent
          .post('/api/v1/drafts')
          .send({
            defaultLanguage: 'en',
            surveyType: 'pulse',
            name: 'Pulse Survey Name'
          })
          .expect(httpStatus.BAD_REQUEST);
      });
    });

    describe('As Power User', () => {
      before(cleanData);

      before(makeTestData);

      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
      });

      let pulseSurveyDriver;
      before(async () => {
        const primaryPulse = await surveyFactory({
          company,
          team,
          surveyType: 'pulse',
          primaryPulse: true,
          defaultLanguage: 'en'
        });

        pulseSurveyDriver = await pulseSurveyDriverFactory({
          company,
          team,
          survey: primaryPulse,
          name: 'driver',
          primaryPulse: true
        });

        const primaryPulseSection = await surveySectionFactory({
          survey: primaryPulse,
          company,
          team,
          pulseSurveyDriver,
          primaryPulse: true,
          name: {
            en: 'Subdriver',
            ru: 'Сабдрайвер',
            de: 'Subdriver'
          },
          description: {
            en: 'Some description about subdriver',
            ru: 'Некое описание о subdriver',
            de: 'Einige Beschreibung über subdriver'
          }
        });

        const linearScale = await questionFactory({
          name: {
            en: 'Question linearScale',
            ru: 'Вопрос linearScale',
            de: 'Frage linearScale'
          },
          fromCaption: {
            en: 'Awful',
            ru: 'Плохо',
            de: 'Schrecklich'
          },
          toCaption: {
            en: 'Awesome',
            ru: 'Хорошо',
            de: 'Fantastisch'
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
            ru: 'NPS Вопрос',
            de: 'Frage netPromoterScore'
          },
          fromCaption: {
            en: 'Awful',
            ru: 'Плохо',
            de: 'Schrecklich'
          },
          toCaption: {
            en: 'Awesome',
            ru: 'Хорошо',
            de: 'Fantastisch'
          },
          passivesComment: {
            en: 'What can we improve on?',
            ru: 'Что мы можем улучшить?',
            de: 'Was können wir verbessern?'
          },
          passivesPlaceholder: {
            en: 'Passive',
            ru: 'Пассивный',
            de: 'Passiv'
          },
          promotersComment: {
            en: 'What did you find most valuable?',
            ru: 'Что вы нашли наиболее ценным?',
            de: 'Was fanden Sie am wertvollsten?'
          },
          promotersPlaceholder: {
            en: 'Promoters',
            ru: 'Положительный',
            de: 'Promoterinnen'
          },
          detractorsComment: {
            en: 'What was missing or disappointing in your experience with us?',
            ru: 'Что вам не хватало или что разочаровало в вашем опыте работы с нами?',
            de: 'Was hat Ihrer Erfahrung mit uns gefehlt oder war enttäuschend?'
          },
          detractorsPlaceholder: {
            en: 'Detractors',
            ru: 'Недоброжелательный',
            de: 'Kritiker'
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
      });

      it('should create survey draft', async () => {
        const res = await agent
          .post('/api/v1/drafts')
          .send({
            defaultLanguage: 'en',
            surveyType: 'survey',
            name: 'Survey Name'
          })
          .expect(httpStatus.CREATED);

        const {
          name,
          translation,
          surveyType,
          type,
          company: reloadCompany,
          team: reloadTeam,
          inDraft,
          surveySections,
          allowReAnswer
        } = res.body;

        const [surveySection] = surveySections;

        expect(surveySection.sortableId).to.be.eq(0);
        expect(surveyType).to.be.eq(surveyType);
        expect(type).to.be.eq('survey');
        expect(name.en).to.be.eq('Survey Name');
        expect(translation.en).to.be.eq(true);
        expect(allowReAnswer).to.be.eq(true);
        expect(reloadCompany).to.be.eq(company._id.toString());
        expect(reloadTeam).to.be.eq(team._id.toString());
        expect(inDraft).to.be.eq(false);
      });

      it('should create template draft', async () => {
        const res = await agent
          .post('/api/v1/drafts')
          .send({
            defaultLanguage: 'en',
            surveyType: 'survey',
            type: 'template'
          })
          .expect(httpStatus.CREATED);

        const {
          name,
          translation,
          surveyType,
          type,
          company: reloadCompany,
          team: reloadTeam,
          inDraft,
          surveySections
        } = res.body;

        const [surveySection] = surveySections;

        expect(surveySection.sortableId).to.be.eq(0);
        expect(surveyType).to.be.eq(surveyType);
        expect(type).to.be.eq('template');
        expect(name.en).to.be.eq('New Template');
        expect(translation.en).to.be.eq(true);
        expect(reloadCompany).to.be.eq(company._id.toString());
        expect(reloadTeam).to.be.eq(team._id.toString());
        expect(inDraft).to.be.eq(false);
      });

      it('should create survey draft with custom animation', async () => {
        const res = await agent
          .post('/api/v1/drafts')
          .send({
            defaultLanguage: 'en',
            surveyType: 'survey',
            name: 'Survey Name',
            customAnimation: true
          })
          .expect(httpStatus.CREATED);

        expect(res.body.displaySingleQuestion).to.be.eq(true);
        expect(res.body.customAnimation).to.be.eq(true);
        expect(res.body.allowReAnswer).to.be.eq(true);

        const surveyTheme = await SurveyTheme.model
          .findOne({ type: 'survey', survey: res.body._id })
          .lean();

        expect(surveyTheme.sectionStyle).to.be.eq('dark');
        expect(surveyTheme.questionStyle).to.be.eq('dark');
        expect(surveyTheme.questionNumbers).to.be.eq(true);
        expect(surveyTheme.progressBar).to.be.eq(true);
      });
      // check if new survey theme created to survey
      xit('should create draft with own survey theme', async () => {

      });

      // check createdAt to related items
      xit('should create draft with correct createdBy', async () => {

      });

      it('should create pulse survey', async () => {
        const res = await agent
          .post('/api/v1/drafts')
          .send({
            defaultLanguage: 'en',
            surveyType: 'pulse',
            name: 'Pulse Survey Name'
          })
          .expect(httpStatus.CREATED);

        const reload = await Survey.model
          .findOne({ _id: res.body._id })
          .populate({
            path: 'surveySections',
            populate: [
              { path: 'pulseSurveyDriver' },
              {
                path: 'surveyItems',
                populate: 'question'
              }
            ]
          })
          .lean();

        expect(reload.primaryPulse).to.be.eq(false);
        expect(reload.surveySections).to.be.an('array');
        expect(reload.surveySections.length).to.be.eq(1);

        const { surveySections: [reloadSection] } = reload;

        expect(reloadSection.pulseSurveyDriver).to.be.an('object');
        expect(reloadSection.surveyItems).to.be.an('array');
        expect(reloadSection.surveyItems.length).to.be.eq(2);

        const {
          surveyItems: [reloadItem1, reloadItem2],
          pulseSurveyDriver: reloadDriver
        } = reloadSection;

        expect(reloadDriver.name).to.be.eq(pulseSurveyDriver.name);

        expect(reloadItem1.type).to.be.eq('question');
        expect(reloadItem2.type).to.be.eq('question');

        expect(reloadItem1.question.pulse).to.be.eq(true);
        expect(reloadItem1.question.primaryPulse).to.be.eq(true);
        expect(reloadItem2.question.pulse).to.be.eq(true);
        expect(reloadItem2.question.primaryPulse).to.be.eq(true);
      });

      it('should create pulse survey without unnecessary translation fields', async () => {
        const res = await agent
          .post('/api/v1/drafts')
          .send({
            defaultLanguage: 'ru',
            name: 'Untitled Pulse',
            surveyType: 'pulse',
            type: 'survey'
          })
          .expect(httpStatus.CREATED);

        const reload = await Survey.model
          .findOne({ _id: res.body._id })
          .populate({
            path: 'surveySections',
            populate: [
              { path: 'pulseSurveyDriver' },
              {
                path: 'surveyItems',
                populate: 'question'
              }
            ]
          })
          .lean();

        const { surveySections } = reload;
        const { surveyItems } = surveySections[0];

        expect(res.body.name).to.not.have.any.keys('en', 'de');
        expect(res.body.name).to.include.property('ru');

        expect(surveySections[0].name).to.not.have.any.keys('en', 'de');
        expect(surveySections[0].name).to.include.property('ru');
        expect(surveySections[0].description).to.not.have.any.keys('en', 'de');
        expect(surveySections[0].description).to.include.property('ru');

        expect(surveyItems[0].question.name).to.not.have.any.keys('en', 'de');
        expect(surveyItems[0].question.name).to.include.property('ru');
        expect(surveyItems[0].question.linearScale.fromCaption).to.not.have.any.keys('en', 'de');
        expect(surveyItems[0].question.linearScale.toCaption).to.include.property('ru');

        expect(surveyItems[1].question.name).to.not.have.any.keys('en', 'de');
        expect(surveyItems[1].question.name).to.include.property('ru');
        expect(surveyItems[1].question.linearScale.fromCaption).to.not.have.any.keys('en', 'de');
        expect(surveyItems[1].question.linearScale.toCaption).to.include.property('ru');

        expect(surveyItems[1].question.promotersPlaceholder).to.not.have.any.keys('en', 'de');
        expect(surveyItems[1].question.promotersPlaceholder).to.include.property('ru');

        expect(surveyItems[1].question.promotersComment).to.not.have.any.keys('en', 'de');
        expect(surveyItems[1].question.promotersComment).to.include.property('ru');

        expect(surveyItems[1].question.passivesPlaceholder).to.not.have.any.keys('en', 'de');
        expect(surveyItems[1].question.passivesPlaceholder).to.include.property('ru');

        expect(surveyItems[1].question.passivesComment).to.not.have.any.keys('en', 'de');
        expect(surveyItems[1].question.passivesComment).to.include.property('ru');

        expect(surveyItems[1].question.detractorsPlaceholder).to.not.have.any.keys('en', 'de');
        expect(surveyItems[1].question.detractorsPlaceholder).to.include.property('ru');

        expect(surveyItems[1].question.detractorsComment).to.not.have.any.keys('en', 'de');
        expect(surveyItems[1].question.detractorsComment).to.include.property('ru');
      });
    });

    describe('As Team User', () => {
      before(cleanData);

      before(makeTestData);

      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should create survey draft', async () => {
        const res = await agent
          .post('/api/v1/drafts')
          .send({
            defaultLanguage: 'en',
            surveyType: 'survey',
            name: 'Survey Name'
          })
          .expect(httpStatus.CREATED);

        const {
          name,
          translation,
          surveyType,
          type,
          company: reloadCompany,
          team: reloadTeam,
          inDraft,
          surveySections
        } = res.body;

        const [surveySection] = surveySections;

        expect(surveySection.sortableId).to.be.eq(0);
        expect(surveyType).to.be.eq(surveyType);
        expect(type).to.be.eq('survey');
        expect(name.en).to.be.eq('Survey Name');
        expect(translation.en).to.be.eq(true);
        expect(reloadCompany).to.be.eq(company._id.toString());
        expect(reloadTeam).to.be.eq(team._id.toString());
        expect(inDraft).to.be.eq(false);
      });

      it('should create template draft', async () => {
        const res = await agent
          .post('/api/v1/drafts')
          .send({
            defaultLanguage: 'en',
            surveyType: 'survey',
            type: 'template'
          })
          .expect(httpStatus.CREATED);

        const {
          name,
          translation,
          surveyType,
          type,
          company: reloadCompany,
          team: reloadTeam,
          inDraft,
          surveySections
        } = res.body;

        const [surveySection] = surveySections;

        expect(surveySection.sortableId).to.be.eq(0);
        expect(surveyType).to.be.eq(surveyType);
        expect(type).to.be.eq('template');
        expect(name.en).to.be.eq('New Template');
        expect(translation.en).to.be.eq(true);
        expect(reloadCompany).to.be.eq(company._id.toString());
        expect(reloadTeam).to.be.eq(team._id.toString());
        expect(inDraft).to.be.eq(false);
      });
    });

    describe('As Template Maker', () => {
      before(cleanData);

      before(makeTestData);

      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email3,
            password
          });

        await Survey.model.remove({ surveyType: 'pulse' });
      });

      it('should create pulse survey with default pulse survey driver', async () => {
        const res = await agent
          .post('/api/v1/drafts')
          .send({
            defaultLanguage: 'en',
            surveyType: 'pulse',
            name: 'Pulse Name'
          })
          .expect(httpStatus.CREATED);

        const {
          name,
          translation,
          surveyType,
          type,
          company: reloadCompany,
          team: reloadTeam,
          inDraft,
          surveySections
        } = res.body;

        expect(surveyType).to.be.eq('pulse');
        expect(type).to.be.eq('survey');
        expect(name.en).to.be.eq('Pulse Name');
        expect(translation.en).to.be.eq(true);
        expect(reloadCompany).to.be.eq(company._id.toString());
        expect(reloadTeam).to.be.eq(team._id.toString());
        expect(inDraft).to.be.eq(false);

        const [surveySection] = surveySections;

        expect(surveySection.sortableId).to.be.eq(0);
        expect(surveySection.pulseSurveyDriver).to.be.an('object');
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post('/api/v1/drafts')
        .send({
          defaultLanguage: 'en',
          surveyType: 'survey'
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
