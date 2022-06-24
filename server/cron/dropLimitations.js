import chalk from 'chalk';
import moment from 'moment';

import {
  GlobalConfig,
  CompanyLimitation
} from '../models';

export default async function dropLimitations() {
  try {
    const globalConfig = await GlobalConfig.model
      .findOne({})
      .select('companyLimitation') // drop all limits
      .lean();

    if (globalConfig && globalConfig.companyLimitation) {
      const dropAt = moment().add(1, 'month').toDate();

      await CompanyLimitation.model.update(
        { dropAt: { $lte: new Date() } },
        { ...globalConfig.companyLimitation, dropAt }
      );
    }

    console.log(chalk.green('Limitations dropped...'));
  } catch (e) {
    console.error(chalk.red(`Drop Limitations cron error: ${e}`));
  }
}
