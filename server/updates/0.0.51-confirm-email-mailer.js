import { Mailer } from '../models';

export default async function mailers(done) {
  try {
    await Promise.all([
      Mailer.model.create({
        name: 'Confirm Email',
        subject: 'Screver - Email Confirmation',
        type: 'base',
        template:
          '<div>' +
          '<p>Confirm email link: ${url}</p>' +
          '</div>'
      })
    ]);

    done();
  } catch (e) {
    done(e);
  }
}
