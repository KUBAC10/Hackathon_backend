import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/invitation';

// ctrl
import invitationCtrl from '../../controllers/api/v1/invitation.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/')
/** POST /api/v1/invitation - Create invite */
  .post(
    accessControl(powerUser('team'), teamUser('team')),
    validate(paramValidation.create),
    invitationCtrl.create
  );

export default router;
