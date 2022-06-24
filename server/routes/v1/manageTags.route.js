import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/manageTags';

// ctrl
import manageTagsCtrl from '../../controllers/api/v1/manageTags.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/:type/:id')
/** PUT /api/v1/manage-tags/:type/:id - tag entities update */
  .put(
    accessControl(powerUser('team'), teamUser('team')),
    validate(paramValidation.updateEntity),
    manageTagsCtrl.updateEntity
  );

export default router;
