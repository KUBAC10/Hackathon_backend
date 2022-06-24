//  models
import {
  Mailer
} from '../models';

export default async function addSupportEmailVar(done) {
  try {
    const limitationMailer = await Mailer.model.findOne({ name: 'Invites Limitation' });
    if (!limitationMailer) return done();

    limitationMailer.template =
      '<div style="text-align: center">' +
      '<p>Hello, ${firstName}</p>' +
      '<p>You had exceed monthly limit of invitations on "Screver Lite" plan</p>' +
      '<p>To upgrade to full version, or any other questions, please contact support:</p>' +
      '<p>${supportEmail}</p>' +
      '</div>';

    await limitationMailer.save();

    done();
  } catch (e) {
    return done(e);
  }
}
