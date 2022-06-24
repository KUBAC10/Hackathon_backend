import moment from 'moment';
import chalk from 'chalk';

// models
import { SurveyCampaign } from '../models';

export default async function distribute() {
  try {
    const cursor = SurveyCampaign.model
      .find({
        status: 'active',
        type: 'email',
        fireTime: {
          $gte: moment().subtract(5, 'minute'),
          $lte: moment()
        },
        pulse: { $ne: true },
        reportsMailing: { $ne: true }
      })
      .cursor();

    for (let campaign = await cursor.next(); campaign != null; campaign = await cursor.next()) {
      await campaign.send();

      await campaign.save();
    }

    console.log(chalk.green('Invites sent out...'));
  } catch (e) {
    console.error(chalk.red(`Distribute cron error: ${e}`));
  }
}
