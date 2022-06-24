import moment from 'moment';
import chalk from 'chalk';
import _ from 'lodash';

// models
import { PulseSurveyRound, SurveyCampaign } from '../models';

// TODO tests
export default async function processPulseSurveyRound() {
  try {
    const result = {
      completed: {},
      started: {},
      processed: {}
    };

    // complete old rounds
    const roundsToComplete = await PulseSurveyRound
      .model
      .find({
        status: 'active',
        endDate: { $lte: new Date() }
      });

    // TODO tests
    for (const round of roundsToComplete) {
      try {
        await round.complete();
        result.completed[round._id] = true;
      } catch (e) {
        console.log(chalk.red(`processPulseSurveyRound round.complete() ${round._id} error: ${e}`));
      }
    }

    // create new rounds
    const campaigns = await SurveyCampaign
      .model
      .find({
        status: 'active',
        pulse: true
      });

    // TODO tests
    for (const campaign of campaigns) {
      try {
        const round = await campaign.createRound();
        if (round) result.started[round._id] = true;
      } catch (e) {
        console.log(chalk.red(`processPulseSurveyRound campaign.createRound() ${campaign._id} error: ${e}`));
      }
    }

    // process active rounds
    const roundsToProcess = await PulseSurveyRound
      .model
      .find({
        status: 'active',
        startDate: { $lte: new Date() }
      })
      .populate('surveyCampaign');

    for (const round of roundsToProcess) {
      // check weekday and time
      const { dayOfWeek, surveyCampaign, startDate, endDate } = round;

      const startDateX = parseInt(moment(startDate)
        .day(_.capitalize(dayOfWeek))
        .format('x'), 10);
      const endDateX = parseInt(moment(endDate)
        .day(_.capitalize(dayOfWeek))
        .format('x'), 10);
      const momentX = parseInt(moment()
        .format('x'), 10);

      // TODO check UTC
      if (startDateX < momentX) {
        try {
          await round.process();
          result.processed[round._id] = true;
        } catch (e) {
          console.log(round, 'round');
          console.log(chalk.red(`processPulseSurveyRound round.process() ${round._id} error: ${e}`));
        }
      }

      // TODO rebuild
      // send auto reminders
      if (!round.reminderSent) {
        // time today with startDate hours and minutes
        const startTimeX = parseInt(moment()
          .set('hour', parseInt(moment(startDate).format('HH'), 10))
          .set('minute', parseInt(moment(startDate).format('mm'), 10))
          .set('second', 0)
          .format('x'), 10);

        // middle time between endDateX and startDateX but with startDate's time (hours + mins)
        const middleTimeX = parseInt(moment(new Date(((endDateX - startDateX) / 2)))
          .set('hour', parseInt(moment(startDate).format('HH'), 10))
          .set('minute', parseInt(moment(startDate).format('mm'), 10))
          .set('second', 0)
          .format('x'), 10);

        if (
          surveyCampaign.sendReminderMailer &&
          (middleTimeX > (endDateX - momentX) && startTimeX < momentX)
        ) {
          try {
            round.reminderSent = true;

            await round.sendReminders({ participation: true });
          } catch (e) {
            console.log(chalk.red(`processPulseSurveyRound round.sendReminders() ${round._id} error: ${e}`));
          }
        }
      }
    }

    // TODO test on cron processing
    return result;
  } catch (e) {
    console.log(chalk.red(`processPulseSurveyRound error: ${e}`));
  }
}
