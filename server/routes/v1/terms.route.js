import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/terms';

// ctrl
import termsCtrl from '../../controllers/api/v1/terms.ctrl';

const router = new express.Router();

router.route('/')
/** GET /api/v1/terms/ */
  .get(validate(paramValidation.show), termsCtrl.show);

export default router;
