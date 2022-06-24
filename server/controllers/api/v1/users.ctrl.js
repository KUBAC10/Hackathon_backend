import httpStatus from 'http-status';
import _ from 'lodash';

// models
import { User } from '../../../models';

// services
import APIMessagesExtractor from '../../../services/APIMessagesExtractor';

// helpers
import { initSession } from '../../../helpers/transactions';
import handleScopes from '../../helpers/handleScopes';
import { hasAccess } from '../../helpers';

const selectFields = 'createdAt currentTeam name email acceptedAt phoneNumber address defaultLanguage avatar isPowerUser';

/** POST /api/v1/users */
async function create(req, res, next) {
  const { userTeams, ...data } = req.body;
  const session = await initSession();

  try {
    handleScopes({ reqScopes: req.scopes, doc: data });

    const doc = new User.model({
      ...data,
      // set current team to first team from user teams
      currentTeam: userTeams[0]
    });

    doc._req_user = { _id: req.user._id };
    doc._userTeams = userTeams;

    await session.withTransaction(async () => await doc.save({ session }));

    // reload user
    const reloadedDoc = await _loadDoc(doc._id);

    return res.json(reloadedDoc);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** PUT /api/v1/users/:id */
async function update(req, res, next) {
  const { id } = req.params;
  const { userTeams, avatar, ...data } = req.body;
  const { lang } = req.cookies;
  const session = await initSession();

  try {
    if (!_.isEqual(data.password, data.confirmPassword)) {
      const error = await APIMessagesExtractor.getError(lang, 'password.confirm');

      return res.status(httpStatus.BAD_REQUEST)
        .send({ message: { confirmPassword: error } });
    }

    // update users with new fields
    const doc = await User.model.findById(id);
    if (!doc) return res.sendStatus(httpStatus.NOT_FOUND);

    handleScopes({ reqScopes: req.scopes, doc });

    Object.assign(doc, data);

    doc._avatar = avatar;
    doc._req_user = { _id: req.user._id };
    doc._userTeams = userTeams;

    await session.withTransaction(async () => await doc.save({ session }));

    // reload user
    const reloadedDoc = await _loadDoc(id);

    return res.json(reloadedDoc);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** DELETE /api/v1/users/:id */
async function destroy(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;
    const query = { _id: id };

    // load doc
    const doc = await User.model.findOne(query);

    if (!doc) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(doc, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    if (doc.isPowerUser) return res.sendStatus(httpStatus.FORBIDDEN);

    await session.withTransaction(async () => await doc.remove({ session }));

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

async function _loadDoc(id) {
  return await User.model
    .findById(id, selectFields)
    .populate([
      {
        path: 'updatedBy',
        select: 'name'
      },
      {
        path: 'createdBy',
        select: 'name'
      },
      {
        path: 'address.country',
        select: 'localization',
      },
      {
        path: 'location',
        select: 'name',
      },
      {
        path: 'userTeams',
        select: 'team',
        populate: {
          path: 'team',
          select: 'name'
        }
      }
    ])
    .lean();
}

export default {
  create,
  update,
  destroy
};
