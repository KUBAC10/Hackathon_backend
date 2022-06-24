import MailGun from 'mailgun-js';

const apiKey = process.env.MAILGUN_API_KEY;
const domain = process.env.MAILGUN_DOMAIN;

const mailGun = new MailGun({ apiKey, domain, host: 'api.eu.mailgun.net' });

export default mailGun;
