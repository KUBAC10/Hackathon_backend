/* eslint-disable */

import { Mailer } from '../models';

export default async function mailers(done) {
  try {
    await Promise.all([
      await Mailer.model.create({
        name: 'User Registration',
        subject: 'Screver - Registration',
        type: 'base',
        template:
          '<div>' +
          '<p>Hi: ${firstName} ${lastName}!</p>' +
          '<p>You was successfully registered in Screver! To confirm your email please redirect to the following link - https://${hostname}/user-confirm/${token}</p>' +
          '</div>'
      }),
      await Mailer.model.create({
        name: 'Confirm Company',
        type: 'base',
        subject: 'Company Confirmation',
        template:
          '<div>' +
          '<p>Hi!</p>' +
          '<p>To confirm your company ${companyName} email please redirect to the following link - https://${hostname}/company-confirm/${token}</p>' +
          '</div>'
      }),
    ])
    done();
  } catch (e) {
    done(e);
  }
}
