import { CronJob } from 'cron';
import cron from '../cron';

import config from '../../config/env';

export default class CronJobs {
  static start = () => {
    // clear Trash at every minute
    const clearTrashJob = new CronJob('* * * * *', cron.clearTrash, true);
    clearTrashJob.start();

    // every minute recount question statistic
    const recountQuestionStatistic = new CronJob('* * * * *', cron.recountQuestionStatistic, true);
    recountQuestionStatistic.start();

    // every minute handle distribute
    const distribute = new CronJob('* * * * *', cron.distribute, true);
    distribute.start();

    // remove preview invites at 00:00
    const removePreviewInvites = new CronJob('0 0 * * *', cron.removePreviewInvites, true);
    removePreviewInvites.start();

    // remove expired invites every hour
    const removeExpiredInvites = new CronJob('0 * * * *', cron.removeExpiredInvites, true);
    removeExpiredInvites.start();

    // drop company limitation every hour
    const dropLimitations = new CronJob('0 * * * *', cron.dropLimitations, true);
    dropLimitations.start();

    // create correlation notifications
    const correlationNotifications = new CronJob('59 23 * * *', cron.correlationNotifications, true);
    correlationNotifications.start();

    // create analytic notifications
    const analyticNotifications = new CronJob('59 23 * * *', cron.analyticNotifications, true);
    analyticNotifications.start();

    // handle pulse survey rounds every minute
    const processPulseSurveyRound = new CronJob('* * * * *', cron.processPulseSurveyRound, true);
    processPulseSurveyRound.start();

    // reports auto mailing every 10 minutes
    const autoReportsMailing = new CronJob('*/10 * * * *', cron.autoReportsMailing, true);
    autoReportsMailing.start();

    if (config.env === 'production') {
      // every minute update survey preview screen shots
      const surveyPreviewScreenShot = new CronJob('* * * * *', cron.surveyPreviewScreenShot, true);
      surveyPreviewScreenShot.start();
    }
  };
}
