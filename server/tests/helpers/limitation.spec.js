import request from 'supertest';
import _ from 'lodash';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// models
import { CompanyLimitation, SurveyResult } from '../../models';

// helpers
import cleanData from '../testHelpers/cleanData';

// factories
import {
  userFactory,
  teamFactory,
  companyFactory,
  globalConfigFactory,
  surveyFactory,
  surveySectionFactory,
  questionFactory,
  questionItemFactory,
  gridRowFactory,
  gridColumnFactory,
  flowLogicFactory,
  flowItemFactory,
  contentItemFactory,
  surveyResultFactory,
  surveyReportItemFactory,
  surveyReportFactory,
  surveyCampaignFactory,
  surveyThemeFactory,
  mailerFactory,
  surveyItemFactory
} from '../factories';

chai.config.includeStack = true;

const email = 'test@email.com';
const password = 'qwe123qwe';
const attr = {};
const data = [
  { factory: surveyReportFactory, key: 'surveyReports' },
  { factory: surveyFactory, key: 'surveys' },
  { factory: surveyResultFactory, key: 'responses' },
  { factory: surveySectionFactory, key: 'surveySections' },
  { factory: questionFactory, key: 'questions' },
  { factory: questionItemFactory, key: 'questionItems' },
  { factory: gridRowFactory, key: 'gridRows' },
  { factory: gridColumnFactory, key: 'gridColumns' },
  { factory: flowLogicFactory, key: 'flowLogic' },
  { factory: flowItemFactory, key: 'flowItems' },
  { factory: contentItemFactory, key: 'contentItems' },
  { factory: surveyReportItemFactory, key: 'surveyReportItems' },
  { factory: surveyCampaignFactory, key: 'surveyCampaigns' },
  { factory: surveyThemeFactory, key: 'surveyThemes' },
  { factory: mailerFactory, key: 'mailers' }
];

let team;
let company;
let defaults;

async function makeTestData() {
  const globalConfig = await globalConfigFactory();

  defaults = globalConfig.companyLimitation;

  // create company and team
  company = await companyFactory({ isLite: true });
  company = company._id;
  team = await teamFactory({ company });
  team = team._id;

  // create power User
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });
}

describe('## Limitation helper', () => {
  before(cleanData);

  before(makeTestData);

  describe('On creation', () => {
    it('should create default limits on lite registration', async () => {
      const res = await request(app)
        .post('/api/v1/registration/lite')
        .send({
          email: 'example@email.com',
          firstName: 'Lite',
          lastName: 'User',
          password: 'password'
        })
        .expect(httpStatus.OK);

      const limit = await CompanyLimitation.model
        .findOne({ company: res.body.company._id })
        .lean();

      expect(limit).to.be.an('object');

      Object.keys(defaults).forEach((key) => {
        expect(limit[key]).to.be.eq(defaults[key]);
        expect(limit[key]).to.not.eq(0);
      });
    });

    it('should do correct decrements on survey creation', async () => {
      const agent = request.agent(app);

      await agent
        .post('/api/v1/authentication')
        .send({
          login: email,
          password
        });

      await agent
        .post('/api/v1/drafts')
        .send({
          defaultLanguage: 'en',
          surveyType: 'survey'
        })
        .expect(httpStatus.CREATED);

      const limit = await CompanyLimitation.model
        .findOne({ company })
        .lean();

      expect(limit).to.be.an('object');
      expect(limit.surveys).to.be.eq(defaults.surveys - 1);
      expect(limit.surveySections).to.be.eq(defaults.surveySections - 1);
      expect(limit.surveyThemes).to.be.eq(defaults.surveyThemes - 1);
      expect(limit.surveyReports).to.be.eq(defaults.surveyReports - 1);
    });
  });

  describe('Handle Limit', () => {
    before(async () => {
      const survey = await surveyFactory({ company, team });
      const question = await surveySectionFactory({ company, team });
      const surveySection = await surveySectionFactory({ company, team, survey });
      const surveyItem = await surveyItemFactory({ company, team, question, surveySection });
      const flowLogic = await flowLogicFactory({ company, team, surveyItem });
      const surveyReport = await surveyReportFactory({ company, team, survey });

      company = await companyFactory({ isLite: true });
      team = await teamFactory({ company });

      attr.survey = survey._id;
      attr.surveySection = surveySection._id;
      attr.question = question._id;
      attr.surveyItem = surveyItem._id;
      attr.flowLogic = flowLogic._id;
      attr.surveyReport = surveyReport._id;
      attr.team = team._id;
      attr.company = company._id;
    });

    data.forEach(({ factory, key }) => {
      it(`should decrement ${key} limit`, async () => {
        await factory(attr);

        const limit = await CompanyLimitation.model
          .findOne({ company: attr.company })
          .lean();

        expect(limit[key]).to.be.eq(defaults[key] - 1);
      });
    });
  });

  describe('Check Limit', () => {
    before(async () => {
      // create company and team
      company = await companyFactory({ isLite: true });
      attr.company = company._id;
      team = await teamFactory({ company });
      attr.team = team._id;
    });

    data.forEach(({ factory, key }) => {
      it(`should return error if ${key} limit exceeded`, async () => {
        try {
          await CompanyLimitation.model.update({ company }, { [key]: 0 });

          await factory(attr);

          throw new Error();
        } catch (err) {
          expect(err.name).to.be.eq('CompanyLimitExceeded');
          expect(err.message).to.be.eq(`Company exceeded monthly limit of ${_.lowerCase(key)}`);

          await CompanyLimitation.model.update({ company }, { [key]: defaults[key] });
        }
      });
    });

    it('should set hide if responsesHide limit exceeded', async () => {
      await CompanyLimitation.model.update({ company }, { responsesHide: 0 });

      let surveyResult = await surveyResultFactory(attr);

      surveyResult.empty = false;
      surveyResult._answer = {};
      surveyResult._oldEmpty = true;

      await surveyResult.save();

      surveyResult = await SurveyResult.model.findById(surveyResult._id).lean();

      expect(surveyResult.hide).to.be.eq(true);
    });
  });
});
