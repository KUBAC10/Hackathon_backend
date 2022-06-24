import chalk from 'chalk';
import moment from 'moment';

// models
import { Invite } from '../models';

export default async function removeExpiredInvites() {
  try {
    // clear preview invites
    await Invite.model.remove({ expiredAt: { $lte: moment() } });

    console.log(chalk.green('Expired Invites Removed...'));
  } catch (e) {
    console.error(chalk.red(`Expired Invites cron error: ${e}`));
  }
}
