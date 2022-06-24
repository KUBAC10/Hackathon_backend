import express from 'express';

import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/teams';

import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';

// ctrl
import teamsCtrl from '../../controllers/api/v1/teams.ctrl';

const router = new express.Router();

router.route('/:id')
/** DELETE /api/v1/teams/:id - Remove team to trash */
  .delete(
    accessControl(powerUser()),
    validate(paramValidation.destroy),
    teamsCtrl.destroy
  );

router.route('/:id/add-team-users')
  /** POST /api/v1/teams/:id/add-team-users - Mass add teamUsers to team */
  .post(
    accessControl(powerUser()),
    validate(paramValidation.addTeamUsers),
    teamsCtrl.addTeamUsers
  );

export default router;
