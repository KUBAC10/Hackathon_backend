import httpStatus from 'http-status';
import _ from 'lodash';

// models
import { SurveyTheme } from '../../../models';

// helpers
import collationParser from '../../../helpers/collationParser';
import { initSession } from '../../../helpers/transactions';
import setInDraftTrigger from '../../helpers/setInDraftTrigger';

/** GET /api/v1/survey-themes - get list of themes */
async function list(req, res, next) {
  try {
    const { skip, limit, name, own = false } = req.query;
    const { _id: createdBy } = req.user;
    const { lang } = req.cookies;

    const query = own ? { createdBy, type: 'user' } : { type: 'global' };

    // handle query
    if (name) query.name = { $regex: name, $options: 'i' };

    // find resources and total
    const [resources, total] = await Promise.all([
      SurveyTheme.model
        .find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(skip, 10))
        .limit(parseInt(limit, 10))
        .collation(collationParser(lang))
        .lean(),
      SurveyTheme.model
        .find(query)
        .countDocuments()
    ]);

    return res.send({ resources, total });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/survey-themes/:id - get theme */
async function show(req, res, next) {
  try {
    const { id: _id } = req.params;
    const { _id: createdBy } = req.user;

    const query = {
      _id,
      $or: [
        { createdBy },
        { type: 'global' }
      ]
    };

    const theme = await SurveyTheme.model
      .findOne(query)
      .lean();

    if (!theme) return res.sendStatus(httpStatus.NOT_FOUND);

    return res.send(_.merge(theme, theme.draftData));
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** POST /api/v1/survey-themes - create user theme */
async function create(req, res, next) {
  const session = await initSession();
  try {
    const { logo, bgImgCloudinary, ...body } = req.body;
    const { companyId: company, currentTeam: team } = req.user;

    const theme = new SurveyTheme.model(body);

    theme._logo = logo;
    theme._bgImgCloudinary = bgImgCloudinary;
    theme._req_user = { _id: req.user._id };
    theme.type = 'user';
    theme.company = company;
    theme.team = team;

    _.merge(theme, body);

    await session.withTransaction(async () => await theme.save({ session }));

    const reloadTheme = await SurveyTheme.model
      .findOne({ _id: theme._id })
      .lean();

    return res.status(httpStatus.CREATED).send(reloadTheme);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** PUT /api/v1/survey-themes/:id - update theme */
async function update(req, res, next) {
  const session = await initSession();

  try {
    const { id: _id } = req.params;
    const { logo, bgImgCloudinary, ...body } = req.body;
    const {
      _id: createdBy,
      companyId: company,
      isAdmin,
      isPowerUser,
      isTemplateMaker,
      currentTeam
    } = req.user;

    const query = {
      _id,
      $or: [
        { createdBy, type: 'user' },
        { type: 'survey', company }
      ]
    };

    if (!isAdmin && !isPowerUser && !isTemplateMaker) query.$or[1].team = currentTeam;

    const theme = await SurveyTheme.model
      .findOne(query)
      .populate({ path: 'survey', select: '_id customAnimation draftData.customAnimation' });

    if (!theme) return res.sendStatus(httpStatus.NOT_FOUND);

    if (theme.type === 'survey') {
      await setInDraftTrigger(theme.survey._id, session);

      const { survey } = theme;
      const draftCustomAnimation = _.get(survey, 'draftData.customAnimation');

      // skip update of appropriate settings if custom animation enable
      if ((survey.customAnimation && draftCustomAnimation === undefined) || draftCustomAnimation) {
        // delete body.progressBar;
        delete body.questionNumbers;
      }

      _.set(theme, 'draftData._logo', logo);

      theme.draftData._bgImgCloudinary = bgImgCloudinary;
      theme.draftData = _.merge(theme.draftData, body);

      theme.markModified('draftData');
    } else {
      theme._logo = logo;
      theme._bgImgCloudinary = bgImgCloudinary;

      _.merge(theme, body);
    }

    await session.withTransaction(async () => await theme.save({ session }));

    const reloadTheme = await SurveyTheme.model
      .findOne({ _id: theme._id })
      .lean();

    return res.send(_.merge(reloadTheme, reloadTheme.draftData));
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** DELETE /api/v1/survey-themes/:id - delete theme */
async function destroy(req, res, next) {
  const session = await initSession();
  try {
    const { id: _id } = req.params;
    const { _id: createdBy } = req.user;

    const query = { _id, createdBy, type: 'user' };

    const theme = await SurveyTheme.model.findOne(query);

    if (!theme) return res.sendStatus(httpStatus.NOT_FOUND);

    await session.withTransaction(async () => await theme.remove({ session }));

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    /* istanbul ignore next */
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
