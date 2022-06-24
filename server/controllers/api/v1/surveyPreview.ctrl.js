import httpStatus from 'http-status';
import uuid from 'uuid/v4';

// models
import { Invite } from '../../../models';

// helpers
import {
  checkPermission,
  hasAccess
} from '../../helpers';

/** POST /api/v1/survey-preview - Create token for preview survey result */
async function create(req, res, next) {
  const { team, ttl, type, surveyId } = req.body;
  try {
    const token = uuid();
    const data = {
      token,
      type,
      ttl,
      company: req.user.companyId,
      preview: true,
      survey: surveyId,
      user: req.user,
    };

    if (type === 'team') data.team = team;

    const invite = new Invite.model(data);

    if (req.user) invite._req_user = { _id: req.user._id };

    await invite.save();

    return res.json(invite);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** DELETE /api/v1/survey-preview/:id - Delete token by id */
async function destroy(req, res, next) {
  try {
    const { id } = req.params;
    const query = { _id: id };

    // load doc
    const doc = await Invite.model.findById(query);

    if (!doc) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(doc, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // check permission to delete
    if (!checkPermission({ user: req.user, doc })) {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }

    // remove doc
    await doc.remove();
    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/survey-preview - Get list of tokens for preview survey result */
async function list(req, res, next) {
  const { surveyId, skip, limit } = req.query;
  try {
    const [resources, total] = await Promise.all([
      Invite.model
        .find({
          survey: surveyId,
          user: req.user
        })
        .populate('team')
        .lean()
        .sort({ createdAt: -1 })
        .skip(parseInt(skip, 10))
        .limit(parseInt(limit, 10)),

      Invite.model
        .find({
          survey: surveyId,
          user: req.user
        })
        .lean()
        .countDocuments()
    ]);

    return res.json({ resources, total });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

export default { create, destroy, list };
