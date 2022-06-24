import httpStatus from 'http-status';

// models
import { Term } from '../../../models';

/** GET /api/v1/terms */
async function show(req, res, next) {
  const { lang } = req.query;
  try {
    const term = await Term
      .model
      .findOne({ nameShort: lang }, '-createdAt -updatedAt -__v')
      .lean();

    if (!term) return res.sendStatus(httpStatus.NOT_FOUND);

    res.cookie('lang', term.nameShort);
    res.json({
      resource: term
    });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

export default { show };
