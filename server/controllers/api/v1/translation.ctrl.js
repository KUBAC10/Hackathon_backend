import httpStatus from 'http-status';
import keystone from 'keystone';
import async from 'async';
import _ from 'lodash';

// config
import { localizationList } from '../../../../config/localization';

// helpers
import translate from '../../../helpers/translate';
import { draftLoaders, hasAccess } from '../../helpers';
import { initSession } from '../../../helpers/transactions';
import setInDraftTrigger from '../../helpers/setInDraftTrigger';

// models
import { Survey, CompanyLimitation } from '../../../models';

const { loadDraftSurvey } = draftLoaders;

/** GET /api/v1/translation - get list of languages */
async function list(req, res, next) {
  try {
    const { name } = req.query;

    if (!name) return res.send(localizationList);

    const langs = localizationList.filter(l => l.label.includes(name) || l.name.includes(name));

    return res.send(langs);
  } catch (e) {
    return next(e);
  }
}

/** POST /api/v1/translation/:id - translate survey to selected lang */
async function translateSurvey(req, res, next) {
  const session = await initSession();

  try {
    const { id } = req.params;
    const { lang: to } = req.body;
    const { isLite } = req.user;
    const query = { _id: id };

    const survey = await Survey.model.findOne(query);

    let companyLimitation;
    if (isLite) {
      companyLimitation = await CompanyLimitation.model.findOne({ company: survey.company });
    }

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const from = _.get(survey, 'draftData.defaultLanguage', survey.defaultLanguage);

    if (!survey.draftData) survey.draftData = {};
    if (!survey.draftData.translation) survey.draftData.translation = {};

    survey.draftData.translation = _.merge(
      _.clone(survey.translation.toObject()), // avoid mutation
      survey.draftData.translation
    );
    survey.draftData.translation[from] = true;
    survey.draftData.translation[to] = true;

    survey._skipHandleDraftTranslation = true;

    await session.withTransaction(async () => await survey.translate({
      session,
      from,
      to,
      companyLimitation,
      deep: true // translate all survey
    }));

    const [
      reloadSurvey
    ] = await Promise.all([
      loadDraftSurvey({ _id: survey._id }),
      // set inDraft trigger
      setInDraftTrigger(survey._id, session)
    ]);

    return res.send(reloadSurvey);
  } catch (e) {
    return next(e);
  }
}

/** GET /api/v1/translation/:id - get field translation */
async function translateField(req, res, next) {
  try {
    const { id } = req.params;
    const { entity, entityId, field } = req.query;
    const { isLite } = req.user;
    const query = { _id: id, inTrash: { $ne: true } };

    const survey = await Survey.model
      .findOne(query)
      .lean();
    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    let companyLimitation;

    if (isLite) {
      companyLimitation = await CompanyLimitation.model.findOne({ company: survey.company });
    }

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const Model = keystone.lists[_.upperFirst(entity)].model;

    // get translation data from survey
    const defaultLanguage = _.get(survey.draftData, 'defaultLanguage', survey.defaultLanguage);
    const translation = _.get(survey.draftData, 'translation', survey.translation);

    // build query for translated entity
    const entityQuery = {
      _id: entityId,
      inTrash: { $ne: true },
      draftRemove: { $ne: true }
    };

    const doc = await Model
      .findOne(entityQuery)
      .select(`draftData.${field} ${field}`)
      .lean();

    const draftPath = `draftData.${field}.${defaultLanguage}`;
    // get text to translate
    const text = _.get(doc, draftPath, _.get(doc, `${field}.${defaultLanguage}`));

    // get translation languages
    const languages = Object
      .keys(translation)
      .filter(lang => translation[lang] &&
        lang !== defaultLanguage &&
        localizationList.includes(lang));

    // init result object
    const result = { current: {} };

    // allow only one translation tread to lite
    const parallelLimit = isLite ? 1 : 5;

    // translate text to each language
    await async.eachLimit(languages, parallelLimit, (lang, cb) => {
      translate(text, { from: defaultLanguage, to: lang }, companyLimitation)
        .then((res) => {
          result[lang] = res;
          result.current[lang] = _.get(doc, `draftData.${field}.${lang}`, _.get(doc, `${field}.${lang}`));

          cb();
        })
        .catch(cb);
    });

    return res.send(result);
  } catch (e) {
    return next(e);
  }
}

/** GET /api/v1/translation/:id/remove - remove translation */
async function removeTranslation(req, res, next) {
  const session = await initSession();

  try {
    const { id } = req.params;
    const { lang: from } = req.query;
    const query = { _id: id, inTrash: { $ne: true } };

    const survey = await Survey.model.findOne(query);

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const defaultLanguage = _.get(survey, 'draftData.defaultLanguage', survey.defaultLanguage);

    // return error on deleting default language
    if (defaultLanguage === from) return res.sendStatus(httpStatus.UNPROCESSABLE_ENTITY);

    _.set(survey, `draftData.translation.${from}`, false);

    survey.markModified(`draftData.translation.${from}`);

    // unset changed field if remove last translation
    const unsetChanged = !Object
      .entries({ ...survey.translation.toObject(), ...survey.draftData.translation })
      .filter(([lang, enable]) => defaultLanguage !== lang && enable)
      .length;

    // remove translation
    await session.withTransaction(async () => await survey.translate({
      unsetChanged,
      from,
      remove: true,
      deep: true
    }));

    const [
      reloadSurvey
    ] = await Promise.all([
      loadDraftSurvey({ _id: survey._id }),
      // set inDraft trigger
      setInDraftTrigger(survey._id, session)
    ]);

    return res.send(reloadSurvey);
  } catch (e) {
    return next(e);
  }
}

/** GET /api/v1/translation/:id/switch - switch default language */
async function switchDefaultLanguage(req, res, next) {
  const session = await initSession();

  try {
    const { id } = req.params;
    const { lang } = req.query;
    const query = { _id: id, inTrash: { $ne: true } };

    const survey = await Survey.model.findOne(query);

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const defaultLanguage = _.get(survey, 'draftData.defaultLanguage', survey.defaultLanguage);

    if (defaultLanguage === lang) return res.sendStatus(httpStatus.UNPROCESSABLE_ENTITY);

    _.set(survey, 'draftData.defaultLanguage', lang);

    await session.withTransaction(async () => await survey.translate({
      from: defaultLanguage,
      to: lang,
      switchLanguage: true,
      deep: true
    }));

    const reloadSurvey = await loadDraftSurvey({ _id: survey._id });

    return res.send(reloadSurvey);
  } catch (e) {
    return next(e);
  }
}

export default {
  list,
  translateSurvey,
  translateField,
  removeTranslation,
  switchDefaultLanguage
};
