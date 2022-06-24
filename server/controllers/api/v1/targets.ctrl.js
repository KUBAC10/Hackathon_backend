import httpStatus from 'http-status';

// helpers
import { handleScopes, hasAccess } from '../../helpers';
import { initSession } from '../../../helpers/transactions';

// models
import {
  Survey,
  Target
} from '../../../models';

// GET /api/v1/targets - list of targets
async function list(req, res, next) {
  try {
    const { survey, skip = 0, limit = 25 } = req.query;

    const query = { survey };

    handleScopes({ reqScopes: req.scopes, query });

    const [
      resources,
      total
    ] = await Promise.all([
      Target.model
        .find(query)
        .populate(
          {
            path: 'surveyCampaigns',
            populate: [
              {
                path: 'tags'
              },
              {
                path: 'contacts',
                select: 'name email'
              }
            ]
          }
        )
        .skip(skip)
        .limit(limit)
        .lean(),
      Target.model
        .find(query)
        .countDocuments()
    ]);

    return res.send({ resources, total });
  } catch (e) {
    return next(e);
  }
}

// POST /api/v1/targets - create target
async function create(req, res, next) {
  try {
    const { name, survey } = req.body;
    const { companyId: company, currentTeam: team } = req.user;

    const surveyDoc = await Survey.model
      .findOne({
        _id: survey,
        inTrash: { $ne: true }
      })
      .lean();

    if (!surveyDoc) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(surveyDoc, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const target = new Target.model({
      survey,
      name,
      company,
      team
    });

    await target.save();

    const reload = await Target.model
      .findById(target._id)
      .populate('surveyCampaigns')
      .lean();

    return res.status(httpStatus.CREATED).send(reload);
  } catch (e) {
    return next(e);
  }
}

// PUT /api/v1/targets/:id - update target
async function update(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;
    const { name, token } = req.body;

    const target = await Target.model.findOne({ _id: id });

    if (!target) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(target, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    if (name) target.name = name;
    if (token) {
      const exists = await Target.model
        .findOne({
          company: target.company,
          token
        })
        .lean();

      if (exists) {
        return res.status(httpStatus.BAD_REQUEST)
          .send({ token: 'Had been already taken' });
      }

      target.token = token;
    }

    await session.withTransaction(async () => await target.save({ session }));

    const reload = await Target.model
      .findById(target._id)
      .populate('surveyCampaigns')
      .lean();

    return res.send(reload);
  } catch (e) {
    return next(e);
  }
}

// DELETE /api/v1/targets/:id - remove target
async function destroy(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;

    const target = await Target.model.findOne({ _id: id });

    if (!target) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(target, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    await session.withTransaction(async () => await target.remove({ session }));

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    return next(e);
  }
}

export default {
  list,
  create,
  update,
  destroy
};
