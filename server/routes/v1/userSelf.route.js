import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/userSelf';

// ctrl
import userSelfCtrl from '../../controllers/api/v1/userSelf.ctrl';

// helpers
import userAuthentication from '../../helpers/userAuthentication';
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/update')
/** PUT /api/v1/user-self/update - user self update info */
  .put(
    userAuthentication(true),
    validate(paramValidation.update),
    userSelfCtrl.update
  );

router.route('/reset-password')
/** POST /api/v1/user-self/reset-password - Reset Password */
  .post(
    validate(paramValidation.resetPassword),
    userSelfCtrl.resetPassword
  );

router.route('/set-password')
/** PUT /api/v1/user-self/set-password - Set Password */
  .put(
    userAuthentication(),
    validate(paramValidation.setPassword),
    userSelfCtrl.setPassword
  );

router.route('/update-password')
/** PUT /api/v1/user-self/update-password - Set new user password with old password */
  .put(
    userAuthentication(true),
    validate(paramValidation.updatePassword),
    userSelfCtrl.updatePassword
  );

router.route('/set-current-team')
/** PUT /api/v1/user-self - Set users current team */
  .put(
    userAuthentication(true),
    validate(paramValidation.setCurrentTeam),
    userSelfCtrl.setCurrentTeam
  );

router.route('/table-column-settings')
/** POST /api/v1/user-self/table-column-settings - Set table column settings */
  .post(
    accessControl(powerUser(), teamUser()),
    validate(paramValidation.setTableColumnSettings),
    userSelfCtrl.setTableColumnSettings
  );

export default router;
