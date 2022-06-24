/* istanbul ignore next */
import moment from 'moment';
import { Mailer, GlobalConfig } from '../models';
import mailBuilder from '../helpers/mailBuilder';
import config from '../../config/env';

export default async function contactUsMailer(options) {
  const { name, email, comment, lang, createdAt } = options;

  try {
    const mailer = await Mailer.model
      .findOne({ name: 'Contact Us' })
      .lean();

    const globalConfig = await GlobalConfig.model
      .findOne({})
      .lean();

    if (!mailer || !globalConfig) return console.error('Contact Us Template Error');

    const data = {
      name,
      email,
      lang,
      comment,
      date: moment(createdAt).format('DD/MM/YYYY HH:mm'),
      hostname: config.hostname,
      year: new Date().getFullYear()
    };

    await mailBuilder({ data, mailer, to: globalConfig.adminEmail, type: 'email', save: true });
  } catch (e) {
    return console.error(e);
  }
}
