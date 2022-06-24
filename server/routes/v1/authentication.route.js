import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/authentication';

// ctrl
import authenticationCtrl from '../../controllers/api/v1/authentication.ctrl';

const router = new express.Router();

router.route('/')
  /** POST /api/v1/authentication - Login User */
  .post(
    validate(paramValidation.login),
    authenticationCtrl.login
  )

  /** GET /api/v1/authentication - Exchange token on User */
  .get(authenticationCtrl.validate)

  /** DELETE /api/v1/authentication - Logout current User */
  .delete(authenticationCtrl.logout);

router.route('/oauth')
  /** POST /api/v1/oauth - Register or login LITE user via social network */
  .post(
    validate(paramValidation.oAuth),
    authenticationCtrl.oAuth
  );

export default router;
