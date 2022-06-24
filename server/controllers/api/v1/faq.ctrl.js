import httpStatus from 'http-status';
import { Faq } from '../../../models';
import { hasAccess } from '../../helpers';

/** GET /api/v1/faq/:urlName */
async function show(req, res, next) {
  try {
    const { urlName } = req.params;
    // find article by urlName
    const faq = await Faq.model.findOne({ urlName })
      .select('name article updatedAt')
      .lean();
    // return error if article not found
    if (!faq) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(faq, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // return article
    return res.json(faq);
  } catch (e) {
    return next(e);
  }
}

export default { show };
