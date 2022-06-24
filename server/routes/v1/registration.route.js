import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/registration';

// ctrl
import registrationCtrl from '../../controllers/api/v1/registration.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
// import powerUser from '../../controllers/access/powerUser';
import liteUser from '../../controllers/access/liteUser';

const router = new express.Router();

// router.route('/')
// /** POST /api/v1/registration
//  * Registration flow - create new company with associated team and Power User */
//   .post(validate(paramValidation.create), registrationCtrl.create);

// router.route('/confirm/user')
// /** POST /api/v1/registration/confirm/user
//  *  Activate and auth new user through confirmation token */
//   .post(validate(paramValidation.confirmUser), registrationCtrl.confirmUser);

// router.route('/confirm/company')
// /** POST /api/v1/registration/confirm/company
//  * Activate company through confirmation token */
//   .post(validate(paramValidation.confirmCompany), registrationCtrl.confirmCompany);

// router.route('/confirm/request-company')
// /** POST /api/v1/registration/confirm/request-company
//  * Request company confirmation mailer */
//   .post(
//     accessControl(powerUser()),
//     validate(paramValidation.requestCompany),
//     registrationCtrl.requestCompany
//   );

router.route('/lite')
  /** POST /api/v1/registration/lite */
  .post(
    validate(paramValidation.lite),
    registrationCtrl.lite
  );

router.route('/confirm/:token')
  /** GET /api/v1/registration/confirm/:token */
  .get(
    validate(paramValidation.confirmEmail),
    registrationCtrl.confirmEmail
  );

router.route('/resend-confirm-email')
  /** GET /api/v1/registration/resend-confirm-email */
  .get(
    accessControl(liteUser()),
    registrationCtrl.resendConfirmEmail
  );

router.route('/lite')
  /** PUT /api/v1/registration/lite  */
  .put(
    accessControl(liteUser()),
    validate(paramValidation.update),
    registrationCtrl.update
  );

export default router;
