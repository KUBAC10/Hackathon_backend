import request from 'supertest';
import httpStatus from 'http-status';
import async from 'async';
import chai, { expect } from 'chai';
import app from 'index';
import moment from 'moment';
import _ from 'lodash';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// cron
import correlationNotifications from '../../../../../cron/correlationNotifications';

// factories
import {
  companyFactory,
  teamFactory,
  surveyFactory,
  surveyResultFactory,
  surveySectionFactory,
  surveyItemFactory,
  questionFactory, userFactory
} from '../../../../factories';

chai.config.includeStack = true;

let company;
let team;
let survey;
let surveyItem1;
let surveyItem2;
const password = 'password';
const email1 = 'test1@email.com';

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create Power user
  await userFactory({ email: email1, password, company, currentTeam: team, isPowerUser: true });

  survey = await surveyFactory({ company, team, lastAnswerDate: moment().toDate() });

  const surveySection = await surveySectionFactory({ company, team, survey });

  const [
    question1,
    question2
  ] = await Promise.all([
    questionFactory({ company, team, type: 'slider' }),
    questionFactory({ company, team, type: 'slider' })
  ]);

  const now = Date.now();

  [
    surveyItem1,
    surveyItem2
  ] = await Promise.all([
    surveyItemFactory({
      company,
      team,
      survey,
      surveySection,
      question: question1,
      createdAt: now
    }),
    surveyItemFactory({
      company,
      team,
      survey,
      surveySection,
      question: question2,
      createdAt: now + 1
    })
  ]);

  await async.eachLimit(_.times(20), 20, (index, cb) => {
    // create survey results
    Promise.all([
      surveyResultFactory({
        survey,
        empty: false,
        answer: {
          [surveyItem1._id]: { value: 100 },
          [surveyItem2._id]: { value: 43 }
        }
      }),
      surveyResultFactory({
        survey,
        empty: false,
        answer: {
          [surveyItem1._id]: { value: 99 },
          [surveyItem2._id]: { value: 21 }
        }
      }),
      surveyResultFactory({
        survey,
        empty: false,
        answer: {
          [surveyItem1._id]: { value: 101 },
          [surveyItem2._id]: { value: 50 }
        }
      })
    ])
      .then(() => cb())
      .catch(cb);
  });

  await correlationNotifications();
}

describe('GET /api/v1/advanced-analyze/surveys/:id/insights', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('As Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email1,
            password
          });
      });

      it('should return insights notification', async () => {
        const res = await agent
          .get(`/api/v1/advanced-analyze/surveys/${survey._id}/insights`)
          .expect(httpStatus.OK);

        const { resources: [{ period, correlation }], total } = res.body;

        expect(period).to.be.eq('days');
        expect(correlation).to.be.eq(0.958);
        expect(total).to.be.eq(1);
      });
    });
  });
});
