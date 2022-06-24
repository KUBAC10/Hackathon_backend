import moment from 'moment';
import chalk from 'chalk';

// models
import {
  Survey,
  AnalyticNotification
} from '../models';

// helpers
import { getAccumulator, filterAccumulator, collectCorrelationData } from '../controllers/helpers/massCorrelation';

// TODO test
// create notification record about correlations
// if survey results in last three days, week or month
// have moderate or strong coefficients
export default async function correlationNotifications() {
  try {
    // build specific ranges
    const ranges = getRanges();

    // create cursor for surveys
    const cursor = Survey.model
      .find({
        type: 'survey',
        lastAnswerDate: {
          $gte: moment().subtract(1, 'month').toDate(),
          $lte: moment().toDate()
        }
      })
      .select('_id company team')
      .lean()
      .cursor();

    for (let survey = await cursor.next(); survey != null; survey = await cursor.next()) {
      const accumulator = await getAccumulator(survey._id);

      if (accumulator.length) {
        for (const { range: { from, to }, period } of ranges) {
          await collectCorrelationData({ survey: survey._id, accumulator, from, to });

          const filteredAcc = filterAccumulator(accumulator);

          await createNotifications(survey, filteredAcc, period, from, to);
        }
      }
    }

    console.log(chalk.green('Correlations calculated, notifications created...'));
  } catch (e) {
    console.error(chalk.red(`Correlation notification cron error: ${e}`));
  }
}

// create analytic notifications by collected data
async function createNotifications(survey, accumulator, period, from, to) {
  try {
    // create notifications
    for (const data of accumulator) {
      const { left, right, correlation } = data;

      const doc = await AnalyticNotification.model
        .findOne({
          survey: survey._id,
          company: survey.company,
          team: survey.team,
          'left.surveyItem': left.surveyItem,
          'right.surveyItem': right.surveyItem,
          $or: [
            { period },
            { correlation }
          ],
          createdAt: {
            $gte: from
          },
          type: 'correlation'
        })
        .lean();

      if (!doc) {
        const notification = new AnalyticNotification.model({
          survey: survey._id,
          company: survey.company,
          team: survey.team,
          type: 'correlation',
          period,
          left,
          right,
          correlation,
          from,
          to
        });

        await notification.save();
      }
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

// build three ranges
function getRanges() {
  const now = moment();

  return [
    {
      period: 'days',
      range: { // first - last three days
        to: now.endOf('day').toDate(),
        from: now.subtract(2, 'day').startOf('day').toDate()
      }
    },
    {
      period: 'week',
      range: { // second - four days before last tree days (first + second = last week)
        to: now.subtract(1, 'day').endOf('day').toDate(),
        from: now.subtract(3, 'day').startOf('day').toDate()
      }
    },
    {
      period: 'month',
      range: { // third - 21 day (first + second + third = last month)
        to: now.subtract(1, 'day').endOf('day').toDate(),
        from: now.subtract(20, 'day').startOf('day').toDate()
      }
    }
  ];
}
