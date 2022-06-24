// base
import httpStatus from 'http-status';
import _ from 'lodash';

// models
import { User, Mailer, GlobalMailer } from '../../../models';

// helpers
import { APIMessagesExtractor } from '../../../services';
import {
  checkPermission,
  hasAccess
} from '../../helpers';

// TODO tests
/** POST /api/v1/mailers/ - Create new mailer */
async function create(req, res, next) {
  try {
    const { type, subject, template, name } = req.body;
    // load user
    const user = await User.model.findById(req.user._id).lean();

    if (!user) return res.sendStatus(httpStatus.UNAUTHORIZED);

    if (_.isEmpty(subject) || _.isEmpty(template)) {
      return res
        .status(400)
        .send({ error: 'Mailer should have data at least for one language (subject and template)' });
    }

    const globalMailer = await GlobalMailer.model.findOne({ type }).lean();

    if (!globalMailer) return res.status(400).send({ error: 'Invalid mailer type' });

    const mailer = new Mailer.model({
      name,
      subject,
      type,
      template,
      globalMailer,
      company: user.company
    });

    mailer._req_user = { _id: req.user._id };

    await mailer.save();

    return res.json(mailer);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// TODO tests
/** PUT /api/v1/mailers/:id - Update mailer */
async function update(req, res, next) {
  try {
    const { subject, template, smsTemplate, name } = req.body;
    const { id } = req.params;
    const query = { _id: id, pulse: { $ne: true } };

    if (_.isEmpty(subject) || _.isEmpty(template)) {
      return res
        .status(400)
        .send({ error: 'Mailer should have data at least for one language (subject and template)' });
    }

    const mailer = await Mailer.model.findOne(query);

    if (!mailer) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(mailer, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // check permission to update
    if (!checkPermission({ user: req.user, doc: mailer, customPermission })) {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }

    Object.assign(mailer, { name, subject, template, smsTemplate });

    mailer._req_user = { _id: req.user._id };

    await mailer.save();

    const reloadedDoc = await Mailer.model
      .findById(mailer._id)
      .populate([
        {
          path: 'createdBy',
          select: 'name'
        },
        {
          path: 'updatedBy',
          select: 'name'
        },
        {
          path: 'globalMailer',
          select: 'description'
        }
      ])
      .lean();

    return res.json(reloadedDoc);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// TODO tests
/** DELETE /api/v1/mailers/:id */
async function destroy(req, res, next) {
  try {
    const { id } = req.params;
    const { lang } = req.cookies;
    const query = { _id: id, distribute: { $ne: true }, pulse: { $ne: true } };

    const doc = await Mailer.model.findOne(query);

    if (!doc) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(doc, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // check permission to update
    if (!checkPermission({ user: req.user, doc })) {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }

    if (doc.fromGlobal) {
      const error = await APIMessagesExtractor.getError(lang, 'mailer.deleteGlobalMailer');
      return res.status(httpStatus.BAD_REQUEST).send({ error });
    }

    // remove doc
    await doc.remove();

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// TODO tests
/** GET /api/v1/mailers/template-sample */
async function templateSample(req, res, next) {
  try {
    const { type } = req.query;

    // load global mailer
    const globalMailer = await GlobalMailer.model.findOne({ type }).lean();

    if (!globalMailer) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ error: 'Cant find template for this type of mailer' });
    }

    // send subject and template from global mailer
    const { subject, template, templateVariables } = globalMailer;
    return res.send({ subject, template, templateVariables });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

function customPermission(doc, user) {
  // power user
  if (user.isPowerUser && user.companyId.toString() === doc.company.toString()) return true;
  // created by
  return doc.createdBy.toString() === user._id.toString();
}

export default { create, update, destroy, templateSample };
