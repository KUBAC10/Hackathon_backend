import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/trash';

// ctrl
import trashCtrl from '../../controllers/api/v1/trash.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/clear')
/** POST /api/v1/trash/clear - clear trash items by ids */
  .post(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.clear),
    trashCtrl.clear
  );

router.route('/:id/restore')
/** POST /api/v1/trash/clear - restore trash item by id */
  .post(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.restore),
    trashCtrl.restore
  );

router.route('/drafts/:id')
/** GET /api/v1/trash/drafts/:id - list of draft trashes */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.draftTrash),
    trashCtrl.draftTrash
  );

export default router;
