import chalk from 'chalk';
import moment from 'moment';

import {
  Invite,
  SurveyResult
} from '../models';

export default async function removePreviewInvites() {
  try {
    // clear preview invites
    await Invite.model.remove({
      preview: true,
      createdAt: { $lte: moment().subtract(3, 'days') }
    });

    // clear preview results
    await SurveyResult.model.remove({
      preview: true,
      createdAt: { $lte: moment().subtract(3, 'days') }
    });

    console.log(chalk.green('Preview Invites And Results Removed...'));
  } catch (e) {
    console.error(chalk.red(`Remove Preview Invites cron error: ${e}`));
  }
}
