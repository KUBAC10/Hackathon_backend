import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/companies';

// ctrl
import companiesCtrl from '../../controllers/api/v1/companies.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import templateMaker from '../../controllers/access/templateMaker';

const router = new express.Router();

router.route('/')
/** GET /api/v1/companies - list of companies */
  .get(
    accessControl(templateMaker()),
    validate(paramValidation.list),
    companiesCtrl.list
  )
  /** PUT /api/v1/companies - update company */
  .put(
    accessControl(powerUser()),
    validate(paramValidation.update),
    companiesCtrl.update
  );

router.route('/future-request')
  /** POST /api/v1/companies/future-request - request sms count */
  .post(
    accessControl(powerUser()),
    validate(paramValidation.futureRequest),
    companiesCtrl.futureRequest
  );

export default router;
