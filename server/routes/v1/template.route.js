import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/templates';

// ctrl
import templateCtrl from '../../controllers/api/v1/templates.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/clone/:id')
/** POST /api/v1/templates/clone/:id - Create template with all related items from survey */
  .post(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.clone),
    templateCtrl.clone
  );


export default router;
