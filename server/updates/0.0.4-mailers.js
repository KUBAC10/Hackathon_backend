/* eslint-disable */

import { Mailer } from '../models';

export default async function mailers(done) {
  try {
    await Promise.all([
      await Mailer.model.create({
        name: 'Contact Us',
        subject: 'Screver - Contact Us',
        type: 'base',
        template:
          '<div>' +
          '<p>${date}</p>' +
          '<p>Person: ${name}, email: ${email}, lang: ${lang}  left comment:</p>' +
          '<p>${comment}</p>' +
          '</div>'
      }),
      await Mailer.model.create({
        name: 'Reset Password',
        subject: '${companyName} - Reset Password',
        type: 'base',
        template:
          '<div>' +
          '<p>We got a request to reset your password.</p>' +
          '<p>For reset your password please redirect to the following link - https://${hostname}/reset-password/${resetToken}</p>' +
          '<p>If you ignore this message, your password will not be changed.</p>' +
          '</div>'
      })
    ])
    done();
  } catch (e) {
    done(e);
  }
}
