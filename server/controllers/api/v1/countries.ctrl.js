import { Country } from '../../../models';

/** GET /api/v1/countries */
async function list(req, res, next) {
  try {
    const { skip, limit, sort, name, answerList = false } = req.query;
    // return all countries from answers
    const query = { show: true };
    // construct search query
    if (name) query.name = { $regex: name, $options: 'i' };
    if (answerList) delete query.show;

    const [resources, total] = await Promise.all([
      Country.model
        .find(query, '-createdAt -updatedAt -__v -show')
        .sort(sort || { sortableId: -1, name: 1 })
        .skip(parseInt(skip, 10))
        .limit(parseInt(limit, 10))
        .lean(),
      Country.model.find(query)
        .countDocuments()
    ]);

    return res.send({ resources, total });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

export default { list };
