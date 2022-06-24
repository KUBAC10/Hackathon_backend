import fs from 'fs';
import Mailer from '../models/Mailer';
import mailBuilder from '../helpers/mailBuilder';
import config from '../../config/env';
import getCompanyName from '../helpers/getCompanyName';

const root = config.root;
const baseTemplate = fs.readFileSync(`${root}/mailers/templates/base.template.html`, 'utf8');
const linkTemplate = fs.readFileSync(`${root}/mailers/templates/link.template.html`, 'utf8');

export default async function resetPasswordMailer(options) {
  const { token, user, lang } = options;

  try {
    const mailer = await Mailer.model
      .findOne({ name: 'Reset Password' })
      .lean();

    if (!mailer) return console.error('Reset Password Template Error');

    const data = {
      link: `${config.hostname}/reset-password/${token}`, // TODO invite to public surveys
      companyName: getCompanyName(user.company),
      firstName: user.name.first || '',
      lastName: user.name.last || '',
      hostname: config.hostname,
      year: new Date().getFullYear()
    };

    // build template
    // add link template
    let template = baseTemplate.replace('${linkTemplate}', linkTemplate);
    // interpolate template with mailer template
    template = template.replace('${content}', mailer.template);
    // reassing parsed template to mailer
    mailer.template = template;

    await mailBuilder({ data, mailer, to: user.email, user, lang, type: 'email', save: true });
  } catch (e) {
    return console.error(e);
  }
}

