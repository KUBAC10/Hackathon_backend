import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/companyOpenText';
import companyOpenTextCtrl from '../../controllers/api/v1/companyOpenText.ctrl';

// access control
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/')
  /** GET /api/v1/company-open-text - Get Open Text Configuration for company */
  .get(
    accessControl(powerUser(), teamUser()),
    validate(paramValidation.getCompanyConfig),
    companyOpenTextCtrl.getCompanyConfig
  )
  /** PUT /api/v1/company-open-text - Update Open Text Configuration for company */
  .put(
    accessControl(powerUser()),
    validate(paramValidation.update),
    companyOpenTextCtrl.update
  );

router.route('/consent')
  /** GET /api/v1/company-open-text/consent - Get Open Text Consent */
  .get(
    accessControl(powerUser(), teamUser()),
    validate(paramValidation.show),
    companyOpenTextCtrl.show
  )
  /** POST /api/v1/company-open-text/consent - Create Open Text Consent */
  .post(
    accessControl(powerUser(), teamUser()),
    validate(paramValidation.create),
    companyOpenTextCtrl.create
  );

export default router;
