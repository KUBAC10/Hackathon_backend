import httpStatus from 'http-status';

// models
import { Email } from '../../../models';

// services
import { APIMessagesExtractor } from '../../../services';
import { hasAccess } from '../../helpers';

/** POST /api/v1/emails/resend */
async function resend(req, res, next) {
  try {
    const { email } = req.body;
    const { lang } = req.cookies;
    const query = { _id: email };

    const doc = await Email.model.findOne(query);

    if (!doc) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(doc, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    doc._req_user = { _id: req.user._id };

    // set resend value to true for resend through model hook
    doc.resend = true;

    await doc.save();

    const message = await APIMessagesExtractor.getMessage(lang, 'email.wasResend');

    return res.send({ message });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

export default { resend };
