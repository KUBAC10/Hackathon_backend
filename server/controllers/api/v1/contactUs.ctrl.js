// models
import httpStatus from 'http-status';
import { ContactUs } from '../../../models';

// services
import APIMessagesExtractor from '../../../services/APIMessagesExtractor';

async function create(req, res, next) {
  const { name, email, comment } = req.body;
  const { lang } = req.cookies;
  try {
    const contactUs = new ContactUs.model({ name, email, comment, lang });
    await contactUs.save();

    const apiMessage = await APIMessagesExtractor.getMessage(lang, 'contactUs.success');

    return res.status(httpStatus.CREATED).send({ message: apiMessage });
  } catch (e) {
    return next(e);
  }
}

export default { create };
