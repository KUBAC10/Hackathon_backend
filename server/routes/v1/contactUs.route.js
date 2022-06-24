import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/contactUs';

// ctrl
import contactUsCtrl from '../../controllers/api/v1/contactUs.ctrl';

const router = new express.Router();

router.route('/')
/** POST /api/v1/contact-us - Create contact us */
  .post(validate(paramValidation.create), contactUsCtrl.create);

export default router;
