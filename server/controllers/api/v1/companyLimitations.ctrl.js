import httpStatus from 'http-status';

// models
import { CompanyLimitation } from '../../../models';

/** GET /api/v1/company-limitations - show current company limits */
async function getLimits(req, res, next) {
  try {
    const { companyId: company } = req.user;

    const limit = await CompanyLimitation.model
      .findOne({ company })
      .select('responses responsesHide invites')
      .lean();

    if (!limit) return res.sendStatus(httpStatus.NOT_FOUND);

    return res.send(limit);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

export default { getLimits };
