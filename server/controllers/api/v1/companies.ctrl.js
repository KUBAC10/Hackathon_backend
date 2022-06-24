import httpStatus from 'http-status';

// models
import {
  Company,
  FutureRequest
} from '../../../models';

// config
import config from '../../../../config/env';

// helpers
import parseSingleDateToRange from '../../../helpers/parseSingleDateToRange';
import { initSession } from '../../../helpers/transactions';
import collationParser from '../../../helpers/collationParser';

/** GET /api/v1/companies */
async function list(req, res, next) {
  try {
    const { skip, limit, name, createdAt, updatedAt, email, urlName, sort } = req.query;
    const { lang, timeZone = config.timezone } = req.cookies;
    const query = {};

    // handle query
    if (name) query.name = { $regex: name, $options: 'i' };
    if (email) query.email = email;
    if (urlName) query.urlName = urlName;
    if (createdAt) query.createdAt = parseSingleDateToRange(createdAt, timeZone);
    if (updatedAt) query.updatedAt = parseSingleDateToRange(updatedAt, timeZone);

    // find resources and total
    const [resources, total] = await Promise.all([
      Company.model.find(query, 'createdAt name email urlName')
        .sort(sort || { createdAt: -1 })
        .skip(parseInt(skip, 10))
        .limit(parseInt(limit, 10))
        .collation(collationParser(lang))
        .lean(),
      Company.model.find(query, '_id')
        .countDocuments()
    ]);

    return res.send({ resources, total });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** PUT /api/v1/companies - update company */
async function update(req, res, next) {
  const session = await initSession();
  try {
    const { companyId: id } = req.user;
    const { logo, ...data } = req.body;

    // load company and return error if it does not exist
    const company = await Company.model.findOne({ _id: id });

    if (!company) return res.sendStatus(httpStatus.NOT_FOUND);

    // assign new values and user
    Object.assign(company, data);

    company._req_user = { _id: req.user._id };
    company._logo = logo;

    // save and reload company
    await session.withTransaction(async () => await company.save({ session }));

    const reloadedDoc = await Company.model
      .findOne({ _id: id })
      .select('createdAt name email address urlName colors logo')
      .populate({ path: 'address.country' })
      .lean();

    return res.json(reloadedDoc);
  } catch (e) {
    return next(e);
  }
}

/** POST /api/v1/companies/future-request */
async function futureRequest(req, res, next) {
  try {
    const { companyId } = req.user;
    const { count } = req.body;

    const futureRequest = new FutureRequest.model({
      count,
      company: companyId
    });

    futureRequest._req_user = req.user;

    await futureRequest.save();

    return res.sendStatus(httpStatus.CREATED);
  } catch (e) {
    return next(e);
  }
}

export default {
  list,
  update,
  futureRequest
};
