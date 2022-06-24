/* istanbul ignore next */
import { Mailer } from '../models';
import mailBuilder from '../helpers/mailBuilder';
import config from '../../config/env';

// TODO not used
export default async function confirmCompany(options) {
  const { name, email, token, lang } = options;

  try {
    const mailer = await Mailer.model
      .findOne({ name: 'Confirm Company' })
      .lean();

    if (!mailer) return console.error('Confirm Company Template Error');

    const data = {
      token,
      companyName: name,
      hostname: config.hostname,
      year: new Date().getFullYear()
    };

    await mailBuilder({ data, mailer, to: email, type: 'email', lang, save: true });
  } catch (e) {
    return console.error(e);
  }
}
