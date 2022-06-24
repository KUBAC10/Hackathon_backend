import httpStatus from 'http-status';

// models
import { Webhook } from '../../../models';

const selectFields = 'url type secret createdAt updatedAt';

async function create(req, res, next) {
  try {
    const { url, type } = req.body;
    const { company } = req.user;

    const webhook = new Webhook.model({
      company,
      url,
      type
    });

    await webhook.save();

    return res.status(httpStatus.CREATED).send(webhook);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

async function show(req, res, next) {
  try {
    const { id } = req.params;
    const { company } = req.user;

    const webhook = await Webhook.model.findOne({ company, _id: id }, selectFields).lean();

    if (!webhook) return res.sendStatus(httpStatus.NOT_FOUND);

    return res.json(webhook);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { url, type } = req.body;
    const { company } = req.user;

    const webhook = await Webhook.model.findOne({ company, _id: id }, selectFields);
    if (!webhook) return res.sendStatus(httpStatus.NOT_FOUND);

    Object.assign(webhook, { url, type });

    await webhook.save();

    return res.json(webhook);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

async function list(req, res, next) {
  try {
    const { skip, limit, sort } = req.query;
    const { company } = req.user;

    const query = { company };

    const [resources, total] = await Promise.all([
      Webhook.model.find(query, selectFields)
        .lean()
        .sort(sort || { createdAt: -1 })
        .skip(parseInt(skip, 10))
        .limit(parseInt(limit, 10)),

      Webhook.model.find(query, selectFields).lean().countDocuments()
    ]);

    return res.send({ resources, total });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

async function destroy(req, res, next) {
  try {
    const { id } = req.params;
    const { company } = req.user;

    const webhook = await Webhook.model.findOne({ company, _id: id });
    if (!webhook) return res.sendStatus(httpStatus.NOT_FOUND);

    await webhook.remove();

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

export default { create, update, show, list, destroy };
