import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/invitationContact';

// ctrl
import invitationCtrl from '../../controllers/api/v1/invitationContact.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/')
/** POST /api/v1/invitation-contact - Invite contacts to survey */
  .post(
    accessControl(powerUser('team'), teamUser('team')),
    validate(paramValidation.invite),
    invitationCtrl.create
  );

router.route('/count')
/** POST /api/v1/invitation-contact/count - Get count of invites by contacts and tags */
  .post(
    accessControl(powerUser(), teamUser()),
    validate(paramValidation.count),
    invitationCtrl.count
  );

router.route('/by-emails')
/** POST /api/v1/invitation-contact/by-emails - Invite by emails */
  .post(
    accessControl(powerUser(), teamUser()),
    validate(paramValidation.byEmails),
    invitationCtrl.byEmails
  );

export default router;
