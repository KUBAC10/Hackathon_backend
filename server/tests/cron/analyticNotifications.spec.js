import app from 'index'; // eslint-disable-line
import chai, { expect } from 'chai';
import moment from 'moment';

// helpers
import cleanData from '../testHelpers/cleanData';

// cron
import analyticNotifications from '../../cron/analyticNotifications';

// models
import { AnalyticNotification } from '../../models';

// factories
import {
  companyFactory,
  teamFactory,
  surveyFactory,
  surveyResultFactory,
  surveySectionFactory,
  surveyItemFactory,
  questionFactory,
  questionItemFactory,
  questionStatisticFactory,
  countryFactory
} from '../factories';

chai.config.includeStack = true;

let company;
let team;
let survey;
let surveySection;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  survey = await surveyFactory({ company, team, lastAnswerDate: moment().toDate() });

  surveySection = await surveySectionFactory({ company, team, survey });
}

describe('## create notification cron', () => {
  beforeEach(cleanData);

  beforeEach(makeTestData);

  describe('By three days period', () => {
    it('should create mostSelectedCountry notification', async () => {
      const question = await questionFactory({ company, team, type: 'countryList' });
      const surveyItem = await surveyItemFactory({
        company,
        team,
        survey,
        surveySection,
        question
      });

      const [
        country1,
        country2
      ] = await Promise.all([
        countryFactory(),
        countryFactory()
      ]);

      await Promise.all([
        questionStatisticFactory({
          surveyItem,
          question,
          syncDB: true,
          time: moment().subtract(1, 'hour'),
          data: {
            [country1._id]: 1
          }
        }),
        questionStatisticFactory({
          surveyItem,
          question,
          time: moment().subtract(4, 'days').subtract(1, 'hour'),
          syncDB: true,
          data: {
            [country2._id]: 1
          }
        })
      ]);

      await analyticNotifications();

      const doc = await AnalyticNotification.model.findOne({
        surveyItem: surveyItem._id
      });

      expect(doc).to.be.an('object');
      expect(doc.company.toString()).to.be.eq(company._id.toString());
      expect(doc.team.toString()).to.be.eq(team._id.toString());
      expect(doc.survey.toString()).to.be.eq(survey._id.toString());
      expect(doc.surveyItem.toString()).to.be.eq(surveyItem._id.toString());
      expect(doc.period).to.be.eq('days');
      expect(doc.type).to.be.eq('mostSelectedCountry');
      expect(doc.country.toString()).to.be.eq(country1._id.toString());
    });

    it('should create mostSelectedValue notification', async () => {
      const question = await questionFactory({ company, team, type: 'thumbs' });
      const surveyItem = await surveyItemFactory({
        company,
        team,
        survey,
        surveySection,
        question
      });

      await Promise.all([
        questionStatisticFactory({
          surveyItem,
          question,
          syncDB: true,
          time: moment().subtract(1, 'hour'),
          data: {
            yes: 1
          }
        }),
        questionStatisticFactory({
          surveyItem,
          question,
          time: moment().subtract(4, 'days').subtract(1, 'hour'),
          syncDB: true,
          data: {
            no: 1
          }
        })
      ]);

      await analyticNotifications();

      const doc = await AnalyticNotification.model.findOne({
        surveyItem: surveyItem._id
      });

      expect(doc).to.be.an('object');
      expect(doc.company.toString()).to.be.eq(company._id.toString());
      expect(doc.team.toString()).to.be.eq(team._id.toString());
      expect(doc.survey.toString()).to.be.eq(survey._id.toString());
      expect(doc.surveyItem.toString()).to.be.eq(surveyItem._id.toString());
      expect(doc.period).to.be.eq('days');
      expect(doc.type).to.be.eq('mostSelectedValue');
      expect(doc.value).to.be.eq('yes');
    });

    it('should create mostSelectedOption notification', async () => {
      const question = await questionFactory({ company, team, type: 'dropdown' });
      const surveyItem = await surveyItemFactory({
        company,
        team,
        survey,
        surveySection,
        question
      });

      const [
        questionItem1,
        questionItem2
      ] = await Promise.all([
        questionItemFactory({ company, team, question }),
        questionItemFactory({ company, team, question })
      ]);

      await Promise.all([
        questionStatisticFactory({
          surveyItem,
          question,
          syncDB: true,
          time: moment().subtract(1, 'hour'),
          data: {
            [questionItem1._id]: 1
          }
        }),
        questionStatisticFactory({
          surveyItem,
          question,
          time: moment().subtract(4, 'days').subtract(1, 'hour'),
          syncDB: true,
          data: {
            [questionItem2._id]: 1
          }
        })
      ]);

      await analyticNotifications();

      const doc = await AnalyticNotification.model.findOne({
        surveyItem: surveyItem._id
      });

      expect(doc).to.be.an('object');
      expect(doc.company.toString()).to.be.eq(company._id.toString());
      expect(doc.team.toString()).to.be.eq(team._id.toString());
      expect(doc.survey.toString()).to.be.eq(survey._id.toString());
      expect(doc.surveyItem.toString()).to.be.eq(surveyItem._id.toString());
      expect(doc.period).to.be.eq('days');
      expect(doc.type).to.be.eq('mostSelectedOption');
      expect(doc.questionItem.toString()).to.be.eq(questionItem1._id.toString());
    });

    it('should create meanValue notification', async () => {
      const question = await questionFactory({ company, team, type: 'slider' });
      const surveyItem = await surveyItemFactory({
        company,
        team,
        survey,
        surveySection,
        question
      });

      await Promise.all([
        questionStatisticFactory({
          surveyItem,
          question,
          syncDB: true,
          time: moment().subtract(1, 'hour'),
          data: {
            100: 1
          }
        }),
        questionStatisticFactory({
          surveyItem,
          question,
          time: moment().subtract(4, 'days').subtract(1, 'hour'),
          syncDB: true,
          data: {
            30: 1
          }
        })
      ]);

      await analyticNotifications();

      const doc = await AnalyticNotification.model.findOne({
        surveyItem: surveyItem._id
      });

      expect(doc).to.be.an('object');
      expect(doc.company.toString()).to.be.eq(company._id.toString());
      expect(doc.team.toString()).to.be.eq(team._id.toString());
      expect(doc.survey.toString()).to.be.eq(survey._id.toString());
      expect(doc.surveyItem.toString()).to.be.eq(surveyItem._id.toString());
      expect(doc.period).to.be.eq('days');
      expect(doc.type).to.be.eq('meanValue');
      expect(doc.coefficient).to.be.eq(233);
    });

    it('should create started notification', async () => {
      const survey = await surveyFactory({
        team,
        company,
        lastAnswerDate: moment().toDate()
      });

      await Promise.all([
        surveyResultFactory({
          survey,
          company,
          team,
          empty: false,
          answer: {}
        }),
        surveyResultFactory({
          survey,
          company,
          team,
          empty: false,
        }),
        surveyResultFactory({
          survey,
          company,
          team,
          empty: false,
          createdAt: moment().subtract(4, 'days')
        })
      ]);

      await analyticNotifications();

      const doc = await AnalyticNotification.model.findOne({
        survey: survey._id
      });

      expect(doc).to.be.an('object');
      expect(doc.company.toString()).to.be.eq(company._id.toString());
      expect(doc.team.toString()).to.be.eq(team._id.toString());
      expect(doc.survey.toString()).to.be.eq(survey._id.toString());
      expect(doc.period).to.be.eq('days');
      expect(doc.type).to.be.eq('started');
      expect(doc.coefficient).to.be.eq(100);
    });

    it('should create completed notification', async () => {
      const survey = await surveyFactory({
        team,
        company,
        lastAnswerDate: moment().toDate()
      });

      await Promise.all([
        surveyResultFactory({
          survey,
          company,
          team,
          completed: true,
          empty: false
        }),
        surveyResultFactory({
          survey,
          company,
          team,
          completed: true,
          empty: false
        }),
        surveyResultFactory({
          survey,
          company,
          team,
          completed: true,
          empty: false,
          createdAt: moment().subtract(4, 'days')
        }),
        surveyResultFactory({
          survey,
          company,
          team,
          completed: false,
          empty: false,
          createdAt: moment().subtract(4, 'days')
        })
      ]);

      await analyticNotifications();

      const doc = await AnalyticNotification.model.findOne({
        survey: survey._id
      });

      expect(doc).to.be.an('object');
      expect(doc.company.toString()).to.be.eq(company._id.toString());
      expect(doc.team.toString()).to.be.eq(team._id.toString());
      expect(doc.survey.toString()).to.be.eq(survey._id.toString());
      expect(doc.period).to.be.eq('days');
      expect(doc.type).to.be.eq('completed');
      expect(doc.coefficient).to.be.eq(100);
    });

    it('should create locationCountry notification', async () => {
      const survey = await surveyFactory({
        team,
        company,
        lastAnswerDate: moment().toDate()
      });

      await Promise.all([
        surveyResultFactory({
          survey,
          company,
          team,
          empty: false,
          location: {
            country: 'Ukraine'
          }
        }),
        surveyResultFactory({
          survey,
          company,
          team,
          empty: false,
          location: {
            country: 'Ukraine'
          }
        }),
        surveyResultFactory({
          survey,
          company,
          team,
          empty: false,
          location: {
            country: 'USA'
          },
          createdAt: moment().subtract(4, 'days')
        }),
        surveyResultFactory({
          survey,
          company,
          team,
          empty: false,
          location: {
            country: 'America'
          },
          createdAt: moment().subtract(4, 'days')
        })
      ]);

      await analyticNotifications();

      const doc = await AnalyticNotification.model.findOne({
        survey: survey._id
      });

      expect(doc).to.be.an('object');
      expect(doc.company.toString()).to.be.eq(company._id.toString());
      expect(doc.team.toString()).to.be.eq(team._id.toString());
      expect(doc.survey.toString()).to.be.eq(survey._id.toString());
      expect(doc.period).to.be.eq('days');
      expect(doc.type).to.be.eq('locationCountry');
      expect(doc.value).to.be.eq('Ukraine');
    });

    it('should create locationCity notification', async () => {
      const survey = await surveyFactory({
        team,
        company,
        lastAnswerDate: moment().toDate()
      });

      await Promise.all([
        surveyResultFactory({
          survey,
          company,
          team,
          empty: false,
          location: {
            city: 'Sumy'
          }
        }),
        surveyResultFactory({
          survey,
          company,
          team,
          empty: false,
          location: {
            city: 'Sumy'
          }
        }),
        surveyResultFactory({
          survey,
          company,
          team,
          empty: false,
          location: {
            city: 'Odessa'
          },
          createdAt: moment().subtract(4, 'days')
        }),
        surveyResultFactory({
          survey,
          company,
          team,
          empty: false,
          location: {
            city: 'Kiev'
          },
          createdAt: moment().subtract(4, 'days')
        })
      ]);

      await analyticNotifications();

      const doc = await AnalyticNotification.model.findOne({
        survey: survey._id
      });

      expect(doc).to.be.an('object');
      expect(doc.company.toString()).to.be.eq(company._id.toString());
      expect(doc.team.toString()).to.be.eq(team._id.toString());
      expect(doc.survey.toString()).to.be.eq(survey._id.toString());
      expect(doc.period).to.be.eq('days');
      expect(doc.type).to.be.eq('locationCity');
      expect(doc.value).to.be.eq('Sumy');
    });
  });
});
