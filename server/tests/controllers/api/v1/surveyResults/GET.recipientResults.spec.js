import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

// factories
import {
  companyFactory,
  surveyFactory,
  surveyResultFactory,
  userFactory,
  teamFactory,
  questionFactory,
  surveyItemFactory,
  pulseSurveyRoundFactory,
  surveySectionFactory,
  surveyCampaignFactory,
  pulseSurveyRecipientFactory
} from '../../../../factories';

chai.config.includeStack = true;

let company;
let team;
let survey;
let rounds;

const email = 'test@email.com';
const password = 'foo123bar';

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  survey = await surveyFactory({ company, team });

  const surveyCampaign = await surveyCampaignFactory({ company, team, survey });

  const [
    recipient1,
    recipient2,
    recipient3
  ] = await Promise.all([
    pulseSurveyRecipientFactory({ company, team, surveyCampaign, survey }),
    pulseSurveyRecipientFactory({ company, team, surveyCampaign, survey }),
    pulseSurveyRecipientFactory({ company, team, surveyCampaign, survey })
  ]);

  const [
    question,
    nps
  ] = await Promise.all([
    questionFactory({ company, team, type: 'linearScale' }),
    questionFactory({ company, team, type: 'netPromoterScore' })
  ]);

  const [
    round1,
    round2,
    round3
  ] = await Promise.all([
    pulseSurveyRoundFactory({ survey }),
    pulseSurveyRoundFactory({ survey }),
    pulseSurveyRoundFactory({ survey })
  ]);

  rounds = [
    round1._id,
    round2._id,
    round3._id
  ];

  const [
    section1,
    section2,
    section3,
  ] = await Promise.all([
    surveySectionFactory({ company, team, survey }),
    surveySectionFactory({ company, team, survey }),
    surveySectionFactory({ company, team, survey })
  ]);

  const [
    surveyItem1,
    surveyItem2,
    surveyItem3
  ] = await Promise.all([
    surveyItemFactory({ company, team, survey, surveySection: section1, question }),
    surveyItemFactory({ company, team, survey, surveySection: section2, question }),
    surveyItemFactory({ company, team, survey, surveySection: section3, question: nps })
  ]);

  await Promise.all([
    surveyResultFactory({
      company,
      team,
      recipient: recipient1,
      pulseSurveyRound: round1,
      answer: {
        [surveyItem1._id]: { value: 3 }
      }
    }),
    surveyResultFactory({
      company,
      team,
      recipient: recipient1,
      pulseSurveyRound: round2,
      answer: {
        [surveyItem2._id]: { value: 3 }
      }
    }),
    surveyResultFactory({
      company,
      team,
      recipient: recipient1,
      pulseSurveyRound: round3,
      answer: {
        [surveyItem2._id]: { value: 3 },
        [surveyItem3._id]: { value: 10 }
      }
    }),

    surveyResultFactory({
      company,
      team,
      recipient: recipient2,
      pulseSurveyRound: round1,
      answer: {
        [surveyItem1._id]: { value: 3 }
      }
    }),
    surveyResultFactory({
      company,
      team,
      recipient: recipient2,
      pulseSurveyRound: round2,
      answer: {
        [surveyItem2._id]: { value: 3 }
      }
    }),
    surveyResultFactory({
      company,
      team,
      recipient: recipient2,
      pulseSurveyRound: round3,
      answer: {
        [surveyItem2._id]: { value: 3 },
        [surveyItem3._id]: { value: 10 }
      }
    }),

    surveyResultFactory({
      company,
      team,
      recipient: recipient3,
      pulseSurveyRound: round1,
      answer: {
        [surveyItem1._id]: { value: 3 }
      }
    }),
    surveyResultFactory({
      company,
      team,
      recipient: recipient3,
      pulseSurveyRound: round2,
      answer: {
        [surveyItem2._id]: { value: 3 }
      }
    }),
    surveyResultFactory({
      company,
      team,
      recipient: recipient3,
      pulseSurveyRound: round3,
      answer: {
        [surveyItem2._id]: { value: 3 },
        [surveyItem3._id]: { value: 10 }
      }
    })
  ]);

  // create power User
  await userFactory({ email, password, company, isPowerUser: true });
}

describe('## GET /api/v1/surveys-results/recipients', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    const agent = request.agent(app);
    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          login: email,
          password
        });
    });

    it('should remove results by idsArray', async () => {
      const res = await agent
        .get('/api/v1/survey-results/recipients')
        .query({
          survey: survey._id.toString()
        })
        .expect(httpStatus.OK);

      expect(res.body.total).to.be.eq(3);
      expect(res.body.resources).to.be.an('array');
      expect(res.body.resources.length).to.be.eq(3);

      const { resources } = res.body;

      resources.forEach((recipient) => {
        expect(recipient.surveyResults).to.be.an('array');
        expect(recipient.surveyResults.length).to.be.eq(3);

        rounds.forEach((round) => {
          expect(recipient.rounds[round]).to.be.an('object');
          expect(recipient.rounds[round].sum).to.be.eq(3);
          expect(recipient.rounds[round].n).to.be.eq(1);
          expect(recipient.rounds[round].averageValue).to.be.eq('3.00');
        });
      });
    });
  });

  describe('Non authorized', () => {
    it('should return error for non authorized request', async () => {
      await request(app)
        .get('/api/v1/survey-results/recipients')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
