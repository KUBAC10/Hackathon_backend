import fs from 'fs';

// mailers
import { Mailer, GlobalConfig } from '../models';

// helpers
import mailBuilder from '../helpers/mailBuilder';
import config from '../../config/env';

const root = config.root;
const baseTemplate = fs.readFileSync(`${root}/mailers/templates/base.template.html`, 'utf8');

export default async function invitesLimitationMailer(options) {
  const { company, limit, lang } = options;

  try {
    // TODO handle logic!!
    if (!company.email) return false;

    const mailer = await Mailer.model
      .findOne({ name: 'Invites Limitation' })
      .lean();

    const globalConfig = await GlobalConfig.model.findOne().lean();

    if (!mailer) return console.error('Invites Limitation Template Error');

    const data = {
      limit,
      supportEmail: globalConfig.supportEmail,
      companyName: 'Screver',
      hostname: config.hostname,
      year: new Date().getFullYear()
    };

    // build template
    // interpolate template with mailer template
    // reassing parsed template to mailer
    mailer.template = baseTemplate.replace('${content}', mailer.template);

    await mailBuilder({ data, mailer, to: company.email, type: 'email', lang, save: true });
  } catch (e) {
    return console.error(e);
  }
}
