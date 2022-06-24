import app from 'index'; // eslint-disable-line
import chai, { expect } from 'chai';
import async from 'async';
import moment from 'moment';
import _ from 'lodash';

// helpers
import cleanData from '../testHelpers/cleanData';

// cron
import correlationNotifications from '../../cron/correlationNotifications';

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
  questionFactory
} from '../factories';

chai.config.includeStack = true;

let company;
let team;
let survey;
let surveyItem1;
let surveyItem2;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

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
}

describe('## create notification cron', () => {
  beforeEach(cleanData);

  beforeEach(makeTestData);

  it('should create notifications days range', async () => {
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

    const notifications = await AnalyticNotification.model
      .find()
      .lean();

    expect(notifications.length).to.be.eq(1);

    const [notification] = notifications;

    expect(notification.survey.toString()).to.be.eq(survey._id.toString());
    expect(notification.company.toString()).to.be.eq(company._id.toString());
    expect(notification.team.toString()).to.be.eq(team._id.toString());
    expect(notification.period).to.be.eq('days');
    expect(notification.left.surveyItem.toString()).to.be.eq(surveyItem1._id.toString());
    expect(notification.right.surveyItem.toString()).to.be.eq(surveyItem2._id.toString());
    expect(notification.correlation).to.be.eq(0.958);
  });

  it('should return empty array because correlation lower than +-0.7 for 10-100 range', async () => {
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
            [surveyItem2._id]: { value: 20 }
          }
        })
      ])
        .then(() => cb())
        .catch(cb);
    });

    await correlationNotifications();

    const notifications = await AnalyticNotification.model
      .find()
      .lean();

    expect(notifications.length).to.be.eq(0);
  });

  it('should return empty array because correlation lower than +-0.5 for 100-300 range', async () => {
    await async.eachLimit(_.times(40), 40, (index, cb) => {
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
            [surveyItem2._id]: { value: 30 }
          }
        })
      ])
        .then(() => cb())
        .catch(cb);
    });

    await correlationNotifications();

    const notifications = await AnalyticNotification.model
      .find()
      .lean();

    expect(notifications.length).to.be.eq(0);
  });

  it('should return empty array because correlation lower than +-0.3 for 300+ range', async () => {
    await async.eachLimit(_.times(100), 30, (index, cb) => {
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
            [surveyItem2._id]: { value: 30 }
          }
        })
      ])
        .then(() => cb())
        .catch(cb);
    });

    await correlationNotifications();

    const notifications = await AnalyticNotification.model
      .find()
      .lean();

    expect(notifications.length).to.be.eq(0);
  }).timeout(3000);

  it('should return array because correlation more than +-0.3 for 300+ range', async () => {
    await async.eachLimit(_.times(101), 30, (index, cb) => {
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
            [surveyItem2._id]: { value: 29 }
          }
        })
      ])
        .then(() => cb())
        .catch(cb);
    });

    await correlationNotifications();

    const notifications = await AnalyticNotification.model
      .find()
      .lean();

    const [{ correlation }] = notifications;

    expect(notifications.length).to.be.eq(1);
    expect(correlation).to.be.eq(0.359);
  }).timeout(3000);

  it('should create notifications week range', async () => {
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
          },
          createdAt: moment().subtract(5, 'day').toDate()
        }),
        surveyResultFactory({
          survey,
          empty: false,
          answer: {
            [surveyItem1._id]: { value: 101 },
            [surveyItem2._id]: { value: 50 }
          },
          createdAt: moment().subtract(6, 'day').toDate()
        })
      ])
        .then(() => cb())
        .catch(cb);
    });

    await correlationNotifications();

    const notifications = await AnalyticNotification.model
      .find()
      .lean();

    expect(notifications.length).to.be.eq(1);

    const [notification] = notifications;

    expect(notification.survey.toString()).to.be.eq(survey._id.toString());
    expect(notification.company.toString()).to.be.eq(company._id.toString());
    expect(notification.team.toString()).to.be.eq(team._id.toString());
    expect(notification.period).to.be.eq('week');
    expect(notification.left.surveyItem.toString()).to.be.eq(surveyItem1._id.toString());
    expect(notification.right.surveyItem.toString()).to.be.eq(surveyItem2._id.toString());
    expect(notification.correlation).to.be.eq(0.958);
  });

  it('should create notifications month range', async () => {
    await async.eachLimit(_.times(20), 20, (index, cb) => {
      // create survey results
      Promise.all([
        surveyResultFactory({
          survey,
          empty: false,
          answer: {
            [surveyItem1._id]: { value: 100 },
            [surveyItem2._id]: { value: 43 }
          },
          createdAt: moment().subtract(30, 'day').toDate()
        }),
        surveyResultFactory({
          survey,
          empty: false,
          answer: {
            [surveyItem1._id]: { value: 99 },
            [surveyItem2._id]: { value: 21 }
          },
          createdAt: moment().subtract(10, 'day').toDate()
        }),
        surveyResultFactory({
          survey,
          empty: false,
          answer: {
            [surveyItem1._id]: { value: 101 },
            [surveyItem2._id]: { value: 50 }
          },
          createdAt: moment().subtract(9, 'day').toDate()
        })
      ])
        .then(() => cb())
        .catch(cb);
    });

    await correlationNotifications();

    const notifications = await AnalyticNotification.model
      .find()
      .lean();

    expect(notifications.length).to.be.eq(1);

    const [notification] = notifications;

    expect(notification.survey.toString()).to.be.eq(survey._id.toString());
    expect(notification.company.toString()).to.be.eq(company._id.toString());
    expect(notification.team.toString()).to.be.eq(team._id.toString());
    expect(notification.period).to.be.eq('month');
    expect(notification.left.surveyItem.toString()).to.be.eq(surveyItem1._id.toString());
    expect(notification.right.surveyItem.toString()).to.be.eq(surveyItem2._id.toString());
    expect(notification.correlation).to.be.eq(1);
  });
});
