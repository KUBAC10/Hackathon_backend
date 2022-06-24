import fs from 'fs';

// models
import { Mailer } from '../models';

// helpers
import mailBuilder from '../helpers/mailBuilder';

// config
import config from '../../config/env';

const root = config.root;
const baseTemplate = fs.readFileSync(`${root}/mailers/templates/base.template.html`, 'utf8');
const linkTemplate = fs.readFileSync(`${root}/mailers/templates/link.template.html`, 'utf8');

export default async function confirmEmail(options) {
  const { token, email, lang } = options;

  try {
    const mailer = await Mailer.model
      .findOne({ name: 'Confirm Email' })
      .lean();

    if (!mailer) return console.error('Confirm Email Template Error');

    const data = {
      companyName: 'Screver',
      link: `${config.hostname}/lite?confirmationToken=${token}`,
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

    await mailBuilder({ data, mailer, to: email, type: 'email', lang, save: true });
  } catch (e) {
    return console.error(e);
  }
}
