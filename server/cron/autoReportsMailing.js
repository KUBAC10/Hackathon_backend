import moment from 'moment';
import chalk from 'chalk';

// models
import { SurveyCampaign } from '../models';

export default async function autoReportsMailing() {
  try {
    const surveyCampaigns = await SurveyCampaign.model.find({
      status: 'active',
      reportsMailing: true,
      fireTime: { $lte: moment() }
    });

    for (const surveyCampaign of surveyCampaigns) {
      await surveyCampaign.sendReport();
    }

    console.log(chalk.green('Auto reports emails sent out...'));
  } catch (e) {
    console.log(chalk.red(`autoReportsMailing error: ${e}`));
  }
}
