import httpStatus from 'http-status';
import _ from 'lodash';

// models
import { Company, Consent } from '../../../models';

// GET - /api/v1/company-open-text/consent
async function show(req, res, next) {
  try {
    const { survey } = req.query;
    // find consent
    const consentDoc = await Consent.model
      .findOne({ survey, user: req.user });

    return res.json({ consent: !!consentDoc });
  } catch (e) {
    next(e);
  }
}

// POST - /api/v1/company-open-text/consent
async function create(req, res, next) {
  try {
    const { survey } = req.body;
    // create new consent
    const consentDoc = new Consent.model({
      survey,
      user: req.user
    });

    await consentDoc.save();

    return res.status(httpStatus.CREATED).send(consentDoc);
  } catch (e) {
    next(e);
  }
}


// PUT - /api/v1/company-open-text
async function update(req, res, next) {
  try {
    // find company
    const company = await Company.model.findById(req.scopes.company);

    if (!company) return res.sendStatus(httpStatus.NOT_FOUND);

    company.openTextConfig = _.merge(company.openTextConfig, req.body);
    company._req_user = { _id: req.user._id };

    const reloadedDoc = await company.save();

    return res.json(reloadedDoc);
  } catch (e) {
    next(e);
  }
}

// GET - /api/v1/company-open-text
async function getCompanyConfig(req, res, next) {
  try {
    // find company
    const company = await Company.model.findById(req.scopes.company, 'openTextConfig');

    if (!company) return res.sendStatus(httpStatus.NOT_FOUND);

    const config = {
      openTextConfig: company.openTextConfig
    };

    // check if consent is present
    if (_.get(config, 'openTextConfig.active')) {
      const consent = await Consent.model
        .findOne({
          user: req.user._id,
          survey: req.query.surveyId
        });

      config.consent = !!consent;
    }

    return res.json(config);
  } catch (e) {
    next(e);
  }
}


export default {
  show,
  create,
  update,
  getCompanyConfig,
};
