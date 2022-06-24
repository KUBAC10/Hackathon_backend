/* istanbul ignore next */
import { Mailer } from '../models';
import mailBuilder from '../helpers/mailBuilder';
import config from '../../config/env';

// TODO not used
export default async function userRegistration(options) {
  const { name, email, token, lang } = options;

  try {
    const mailer = await Mailer.model
      .findOne({ name: 'User Registration' })
      .lean();

    if (!mailer) return console.error('User Registration Template Error');

    const data = {
      token,
      firstName: name.first || '',
      lastName: name.last || '',
      hostname: config.hostname,
      year: new Date().getFullYear()
    };

    await mailBuilder({ data, mailer, to: email, type: 'email', lang, save: true });
  } catch (e) {
    return console.error(e);
  }
}
