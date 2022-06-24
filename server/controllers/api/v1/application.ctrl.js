import keystone from 'keystone';
import _ from 'lodash';
import httpStatus from 'http-status';

// services
import APIMessagesExtractor from '../../../services/APIMessagesExtractor';

// helpers
import { initSession } from '../../../helpers/transactions';
import {
  handleScopes,
  checkPermission,
  hasAccess
} from '../../helpers';
import collationParser from '../../../helpers/collationParser';

/** GET /api/v1/:list */
async function list(req, res, next) {
  try {
    const { select, populate, defaultSort, query: instQuery } = req.instructions;
    const { skip, limit } = req.query;
    const { lang } = req.cookies;
    const query = instQuery ? await instQuery(req, res, next) : {};

    // Init sort after run instructions query. It can be changed there.
    const { sort } = req.query;
    const list = _.kebabCase(req.params.list);

    await handleScopes({ reqScopes: req.scopes, query });

    const Model = keystone.lists[keystone.paths[list]].model;

    const [resources, total] = await Promise.all([
      Model.find(query, select)
        .populate(populate || [])
        .sort(sort || defaultSort)
        .skip(parseInt(skip, 10))
        .limit(parseInt(limit, 10))
        .collation({ locale: collationParser(lang) })
        .lean(),
      Model.find(query, select).lean()
        .countDocuments()
    ]);

    return res.send({ resources, total });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/:list/:id */
async function show(req, res, next) {
  try {
    const { id } = req.params;
    const { select, populate, query: instQuery, customAccess, omit } = req.instructions;

    const list = _.kebabCase(req.params.list);
    const Model = keystone.lists[keystone.paths[list]].model;
    const query = instQuery ? await instQuery(req) : { _id: id };

    let doc = await Model
      .findOne(query, select)
      .populate(populate || [])
      .lean();

    if (!doc) return res.sendStatus(httpStatus.NOT_FOUND);

    const accessFields = customAccess ? customAccess(doc, req.scopes) : req.scopes;

    if (!hasAccess(doc, accessFields)) return res.sendStatus(httpStatus.FORBIDDEN);

    if (omit) doc = _.omit(doc, omit);

    return res.json(doc);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** POST /api/v1/:list */
async function create(req, res, next) {
  const session = await initSession();
  try {
    const { select, populate, message, postHook, afterSave } = req.instructions;
    const { additionParams = {}, ...data } = req.body;
    const { lang } = req.cookies;

    const list = _.kebabCase(req.params.list);
    const Model = keystone.lists[keystone.paths[list]].model;

    let doc = new Model(data);

    if (data.items) doc.items = data.items;

    if (req.user) doc._req_user = { _id: req.user._id };

    if (req.user.isTemplateMaker) doc.isGlobal = true;

    handleScopes({ reqScopes: req.scopes, doc });

    await session.withTransaction(async () => {
      await doc.save({ session });

      if (afterSave) await afterSave(doc, req, session);
    });

    doc = await Model
      .findById(doc, select, { session })
      .populate(populate || [])
      .lean();

    if (postHook) postHook(doc, additionParams);

    if (message) {
      const apiMessage = await APIMessagesExtractor.getMessage(lang, message);

      return res.status(httpStatus.CREATED).send({ message: apiMessage });
    }

    return res.status(httpStatus.CREATED).send(doc);
  } catch (e) {
    return next(e);
  }
}

/** PUT /api/v1/:list/:id */
async function update(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;
    const { select, populate, afterSave } = req.instructions;

    const list = _.kebabCase(req.params.list);
    const Model = keystone.lists[keystone.paths[list]].model;
    const query = { _id: id };

    const doc = await Model.findOne(query);

    if (!doc) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(doc, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // check permission to update
    if (!checkPermission({ user: req.user, doc })) return res.sendStatus(httpStatus.FORBIDDEN);

    const { logo, ...body } = req.body;

    body._logo = logo; // handle team logo

    Object.assign(doc, body);

    if (req.user) doc._req_user = { _id: req.user._id };

    handleScopes({ reqScopes: req.scopes, doc });

    await session.withTransaction(async () => {
      await doc.save({ session });

      if (afterSave) await afterSave(doc, req, session);
    });

    const reloadedDoc = await Model
      .findOne({ _id: id }, select, { session })
      .populate(populate || [])
      .lean();

    return res.json(reloadedDoc);
  } catch (e) {
    return next(e);
  }
}

/** DELETE /api/v1/:list/:id */
async function destroy(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;
    const { lang } = req.cookies;
    const { customPermission } = req.instructions;

    const list = _.kebabCase(req.params.list);
    const Model = keystone.lists[keystone.paths[list]].model;
    const query = { _id: id };

    const doc = await Model.findOne(query);

    if (!doc) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(doc, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // check permission to remove
    if (!checkPermission({ customPermission, doc, user: req.user })) {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }

    doc._lang = lang;

    await session.withTransaction(async () => await doc.remove({ session }));

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    return next(e);
  }
}

export default {
  list,
  show,
  create,
  update,
  destroy
};
