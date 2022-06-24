/* eslint-disable */

import { Mailer } from '../models';

export default async function mailers(done) {
  try {
    await Mailer.model.create({
      name: 'Survey Invitation',
      subject: 'Survey Invitation',
      type: 'surveyInvitation',
      template:
        '<div>' +
        '<p>Hi: ${firstName} ${lastName}!</p>' +
        '<p>You was successfully invited to survey - ${surveyName}! To complete survey please redirect to the following link - https://${hostname}/survey?token=${token}</p>' +
        '</div>'    })

    done();
  } catch (e) {
    done(e);
  }
}
