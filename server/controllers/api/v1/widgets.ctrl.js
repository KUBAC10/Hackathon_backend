import httpStatus from 'http-status';
import _ from 'lodash';

// models
import {
  Dashboard,
  Widget,
  WidgetCategory,
  WidgetPreview
} from '../../../models';

// helpers
import { hasAccess } from '../../helpers';
import { initSession } from '../../../helpers/transactions';

// TODO test
// GET /api/v1/widgets/categories - return widget categories list
async function getCategories(req, res, next) {
  try {
    const widgetCategories = await WidgetCategory.model.find();

    return res.send({ widgetCategories });
  } catch (e) {
    return next(e);
  }
}

// TODO test
// GET /api/v1/widget/categories/:id - return widget previews by category
async function showCategory(req, res, next) {
  try {
    const { id } = req.params;

    const widgetCategory = await WidgetCategory.model
      .findById(id)
      .lean();

    if (!widgetCategory) return res.sendStatus(httpStatus.NOT_FOUND);

    widgetCategory.widgetPreviews = await WidgetPreview.model
      .find({
        widgetCategory: widgetCategory._id,
        parent: { $exists: false }
      })
      .populate('children')
      .lean();

    return res.send(widgetCategory);
  } catch (e) {
    return next(e);
  }
}

// POST /api/v1/widgets - create widget
async function create(req, res, next) {
  try {
    const { dashboardId } = req.body;
    const { user } = req;

    const dashboard = await Dashboard.model
      .findById(dashboardId)
      .lean();

    if (!dashboard) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(dashboard, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const { company, team } = dashboard;

    const widget = new Widget.model({
      dashboard,
      company,
      team
    });

    _.merge(widget, req.body);

    widget._req_user = user;

    await widget.save();

    const reload = await Widget.model
      .findById(widget._id)
      .lean();

    return res.status(httpStatus.CREATED).send(reload);
  } catch (e) {
    return next(e);
  }
}

// PUT /api/v1/widgets/:id - update widget
async function update(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;
    const { user } = req;

    const widget = await Widget.model.findById(id);

    if (!widget) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(widget, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    Object.assign(widget, req.body);

    widget._req_user = user;

    await session.withTransaction(async () => await widget.save({ session }));

    const reload = await Widget.model
      .findById(widget._id)
      .lean();

    return res.send(reload);
  } catch (e) {
    return next(e);
  }
}

// DELETE /api/v1/widgets/:id - remove widget
async function destroy(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;

    const widget = await Widget.model.findById(id);

    if (!widget) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(widget, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    await session.withTransaction(async () => await widget.remove({ session }));

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    return next(e);
  }
}

// TODO test
// GET /api/v1/widgets/:id - get widget data
async function data(req, res, next) {
  try {
    const { id } = req.params;

    const widget = await Widget.model.findById(id);

    if (!widget) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(widget, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const data = await widget.getData();

    return res.send(data);
  } catch (e) {
    return next(e);
  }
}

export default {
  getCategories,
  showCategory,
  create,
  update,
  destroy,
  data
};
