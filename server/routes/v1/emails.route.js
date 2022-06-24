import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/emails';
import emailsCtrl from '../../controllers/api/v1/emails.ctrl';

// access control
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';

const router = new express.Router();

router.route('/resend')
/** POST /api/v1/emails/resend - Resend email */
  .post(
    accessControl(powerUser()),
    validate(paramValidation.resendEmail),
    emailsCtrl.resend
  );

export default router;
