import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/targets';

// ctrl
import targetsCtrl from '../../controllers/api/v1/targets.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/')
  // GET /api/v1/targets - list of targets
  .get(
    accessControl(powerUser('team'), teamUser('team')),
    validate(paramValidation.list),
    targetsCtrl.list
  )
  // POST /api/v1/targets - create target
  .post(
    accessControl(powerUser('team'), teamUser('team')),
    validate(paramValidation.create),
    targetsCtrl.create
  );

router.route('/:id')
  // PUT /api/v1/targets/:id - update target
  .put(
    accessControl(powerUser('team'), teamUser('team')),
    validate(paramValidation.update),
    targetsCtrl.update
  )
  // DELETE /api/v1/targets/:id - remove target
  .delete(
    accessControl(powerUser('team'), teamUser('team')),
    validate(paramValidation.destroy),
    targetsCtrl.destroy
  );

export default router;
