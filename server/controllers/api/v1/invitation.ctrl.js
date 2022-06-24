import httpStatus from 'http-status';
import uuid from 'uuid/v4';

// models
import {
  Survey,
  Invite,
} from '../../../models';

// helpers
import handleScopes from '../../helpers/handleScopes';

import config from '../../../../config/env';

/** POST /api/v1/invitation - Create invitation to survey */
async function create(req, res, next) {
  try {
    const { survey } = req.body;
    const query = { _id: survey };

    // assign current company/team scope
    handleScopes({ reqScopes: req.scopes, query });

    // load survey
    const surveyDoc = await Survey.model
      .findOne(query)
      .lean();

    if (!surveyDoc) return res.sendStatus(httpStatus.NOT_FOUND);

    // generate token
    const token = uuid();

    const doc = new Invite.model({
      token,
      survey
    });

    // assign current company/team scope
    handleScopes({ reqScopes: req.scopes, doc });

    doc._req_user = { _id: req.user._id };

    await doc.save();

    return res.send({ link: `${config.hostname}/survey?token=${token}` });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

export default { create };
