// models
import { Mailer } from '../models';

export default async function invitesLimitMailer(done) {
  try {
    await Mailer.model.create({
      name: 'Invites Limitation',
      subject: 'Invites Limitation',
      type: 'base',
      template:
        '<div>' +
        '<p>Distribute in you lite company soon exceed limit of invites ${limit}.</p>' +
        '</div>'
    });

    console.log('Created invites limit mailer');
    done();
  } catch (e) {
    console.error('Updates error: 0.0.55 create invites limit mailer', e);
    done(e);
  }
}
