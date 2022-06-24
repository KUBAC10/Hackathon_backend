import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/companyColors';
import companyColorsCtrl from '../../controllers/api/v1/companyColors.ctrl';

// access control
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';

const router = new express.Router();

router.route('/')
/** PUT /api/v1/company-colors - Update company colors */
  .put(
    accessControl(powerUser()),
    validate(paramValidation.update),
    companyColorsCtrl.update
  );

export default router;
