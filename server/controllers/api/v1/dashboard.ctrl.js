import httpStatus from 'http-status';
import _ from 'lodash';

// models
import {
  Dashboard,
  User,
  Survey,
  Question,
  Contact,
  Company
} from '../../../models';

// helpers
import handleScopes from '../../helpers/handleScopes';
import { hasAccess } from '../../helpers';
import { initSession } from '../../../helpers/transactions';

// POST /api/v1/dashboards - create new dashboard
async function create(req, res, next) {
  try {
    const { companyId: company, currentTeam: team } = req.user;
    const { name } = req.body;

    const dashboard = new Dashboard.model({ company, team, name });

    await dashboard.save();

    const reload = await Dashboard.model
      .findById(dashboard._id)
      .lean();

    return res.status(httpStatus.CREATED).send(reload);
  } catch (e) {
    return next(e);
  }
}

// GET /api/v1/dashboards - get list of dashboards
async function list(req, res, next) {
  try {
    const { skip = 0, limit = 10 } = req.query;

    const query = {};

    // apply user scopes on query
    handleScopes({ reqScopes: req.scopes, query });

    const [
      resources,
      total
    ] = await Promise.all([
      Dashboard.model
        .find(query)
        .skip(skip)
        .limit(limit)
        .lean(),
      Dashboard.model
        .find(query)
        .countDocuments()
    ]);

    return res.send({ resources, total });
  } catch (e) {
    return next(e);
  }
}

// GET /api/v1/dashboards/:id - show dashboard
async function show(req, res, next) {
  try {
    const { id } = req.params;

    const dashboard = await Dashboard.model
      .findById(id)
      .populate('widgets')
      .lean();

    if (!dashboard) return res.sendStatus(httpStatus.FORBIDDEN);

    if (!hasAccess(dashboard, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    return res.send(dashboard);
  } catch (e) {
    return next(e);
  }
}

// PUT /api/v1/dashboards/:id - update dashboard
async function update(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;

    const dashboard = await Dashboard.model.findById(id);

    if (!dashboard) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(dashboard, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    _.merge(dashboard, req.body);

    await session.withTransaction(async () => await dashboard.save({ session }));

    const reload = await Dashboard.model
      .findById(dashboard._id)
      // .populate('widgets')
      .lean();

    return res.send(reload);
  } catch (e) {
    return next(e);
  }
}

// DELETE /api/v1/dashboards/:id - delete dashboard
async function destroy(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;

    const dashboard = await Dashboard.model.findById(id);

    if (!dashboard) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(dashboard, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    await session.withTransaction(async () => await dashboard.remove({ session }));

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    return next(e);
  }
}

// // POST /api/v1/dashboard/items - Configure dashboard items
// async function items(req, res, next) {
//   const { items, type } = req.body;
//   try {
//     const user = await User.model.findById({ _id: req.user._id });
//     for (const [index, item] of items.entries()) {
//       const dashboardItemDoc = await DashboardItem.model
//         .findOne({ user, type, [type]: item });
//
//       if (dashboardItemDoc) {
//         // set sortableId to each element depending on array index
//         dashboardItemDoc.sortableId = index;
//
//         await dashboardItemDoc.save();
//       } else {
//         const dashboardItemDoc = new DashboardItem.model({
//           user,
//           type,
//           sortableId: index,
//           [type]: item
//         });
//         handleScopes({ reqScopes: req.scopes, doc: dashboardItemDoc });
//         await dashboardItemDoc.save();
//       }
//     }
//
//     // handle and remove old dashboard items
//     await DashboardItem.model
//       .find({
//         user,
//         type,
//         [type]: { $nin: items }
//       })
//       .remove();
//
//     // handle new trend questions
//     const reloadedItems = await DashboardItem.model
//       .find({ user, type, [type]: { $exists: true, $ne: null } })
//       .populate(type)
//       .sort({ sortableId: 1 })
//       .lean();
//
//     return res.json(reloadedItems);
//   } catch (e) {
//     /* istanbul ignore next */
//     return next(e);
//   }
// }
//
// // GET /api/v1/dashboard - dashboard items list
// async function list(req, res, next) {
//   try {
//     const { type } = req.query;
//
//     // collect query
//     const query = {
//       type,
//       user: req.user._id,
//       [type]: { $exists: true, $ne: null }
//     };
//
//     handleScopes({ reqScopes: req.scopes, query });
//     const items = await DashboardItem.model
//       .find(query)
//       .populate({
//         path: 'survey',
//         select:
//      '_id name translation lastAnswerDate totalCompleted startDate endDate active publicAccess'
//       })
//       .populate({
//         path: 'question',
//         select: '_id name translation'
//       })
//       .sort({ sortableId: 1 })
//       .lean();
//
//     return res.json(items);
//   } catch (e) {
//     /* istanbul ignore next */
//     return next(e);
//   }
// }
//

// GET /api/v1/dashboards/summary - dashboard items list
async function summary(req, res, next) {
  try {
    const { _id, companyId: company, currentTeam, isPowerUser, isAdmin } = req.user;

    // base query
    const query = { company, inTrash: { $ne: true } };
    // build dedicated query for templates and questions
    const templateQuery = { type: 'template', inTrash: { $ne: true } };
    const questionQuery = { inTrash: { $ne: true } };

    if (!isPowerUser && !isAdmin) query.team = currentTeam;

    // assign scopes
    handleScopes({ query, reqScopes: req.scopes });
    handleScopes({ reqScopes: req.scopes, query: templateQuery });
    handleScopes({ reqScopes: req.scopes, query: questionQuery });

    // load company to get open text questions config
    const companyDoc = await Company.model.findById(company).lean();
    // TODO add tests
    // if text questions are disabled - exclude them from query
    if (_.get(companyDoc, 'openTextConfig.disableTextQuestions')) questionQuery.type = { $ne: 'text' };

    const [
      surveys,
      trendQuestions,
      generalQuestions,
      templates,
      contacts,
      users
    ] = await Promise.all([
      Survey.model
        .find({ ...query, type: 'survey' })
        .countDocuments(),
      Question.model
        .find({ ...questionQuery, trend: true })
        .countDocuments(),
      Question.model
        .find({ ...questionQuery, general: true })
        .countDocuments(),
      Survey.model
        .find(templateQuery)
        .countDocuments(),
      Contact.model
        .find(query)
        .countDocuments(),
      User.model
        .find({ ...query, _id: { $ne: _id } })
        .countDocuments(),
    ]);

    const data = {
      surveys,
      trendQuestions,
      generalQuestions,
      templates,
      contacts,
      users
    };

    return res.json(data);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}
//
// // POST /api/v1/dashboard/coordinates - post coordinates for dashboard map
// async function coordinates(req, res, next) {
//   const client = new Client({});
//   try {
//     const { lat, lng, token, fingerprintId, surveyId, surveyResultId } = req.body;
//     const seconds = 86400; // 1 day
//
//     //  generating data for surveyResult
//     const { data: geocodeData } = await _getGoogleMapsData(client, lat, lng);
//     const formattedAddress = _.get(geocodeData, 'results[0].formatted_address', '');
//     const location = {
//       coordinates: {
//         lat,
//         lng
//       },
//       formattedAddress
//     };
//     // load survey to get company
//     const survey = await Survey.model
//       .findById(surveyId)
//       .lean();
//
//     if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);
//
//     const { company } = survey;
//     const geoData = {
//       lat,
//       lng,
//       surveyId,
//       time: moment().format('x'),
//     };
//
//     if (token) {
//       await redisClient.hmsetAsync(`geo:${company}:${token}`, geoData);
//       await redisClient.expireAsync(`geo:${company}:${token}`, seconds);
//     }
//
//     if (fingerprintId) {
//       await redisClient.hmsetAsync(`geo:${company}:${fingerprintId}`, geoData);
//       await redisClient.expireAsync(`geo:${company}:${fingerprintId}`, seconds);
//     }
//
//     if (surveyResultId) {
//       await SurveyResult.model.updateOne({ _id: surveyResultId }, { $set: { location } });
//     }
//     return res.sendStatus(httpStatus.OK);
//   } catch (e) {
//     /* istanbul ignore next */
//     return next(e);
//   }
// }
//
// // TODO: optimize Redis logic with SCAN method
// // GET /api/v1/dashboard/coordinates/list - get list of coordinates for dashboard map
// async function coordinatesList(req, res, next) {
//   try {
//     const { company } = req.scopes;
//     const keys = await redisClient.keysAsync(`geo:${company}:*`);
//     const items = [];
//     const results = [];
//
//     for (const key of keys) {
//       items.push(await redisClient.hgetallAsync(key));
//     }
//
//     const filteredItems = items.filter(i => i.surveyId)
//       .sort((a, b) => b.time - a.time)
//       .slice(0, 49);
//
//     for (const item of filteredItems) {
//       item.survey = await Survey.model
//         .findOne({ _id: item.surveyId, company })
//         .select('name')
//         .lean();
//       if (item.survey) results.push(item);
//     }
//
//     return res.json(results);
//   } catch (e) {
//     /* istanbul ignore next */
//     return next(e);
//   }
// }
//
// async function _getGoogleMapsData(client, lat, lng) {
//   /* istanbul ignore if */
//   if (config.env !== 'test') {
//     return await client.geocode({
//       params: {
//         latlng: `${lat}, ${lng}`,
//         language: 'en',
//         result_type: 'street_address',
//         location_type: 'RANGE_INTERPOLATED|ROOFTOP|APPROXIMATE',
//         key: process.env.GOOGLE_API_KEY
//       }
//     });
//   }
//   return {
//     data: {
//       results: [{ formatted_address: faker.lorem.sentence() }],
//     }
//   };
// }

export default {
  create,
  list,
  show,
  update,
  destroy,
  // items,
  // list,
  summary,
  // coordinates,
  // coordinatesList
};
