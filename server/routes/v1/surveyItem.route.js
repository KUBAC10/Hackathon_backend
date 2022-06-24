import express from 'express';

import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/surveyItems';

import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

// ctrl
import surveyItemsCtrl from '../../controllers/api/v1/surveyItems.ctrl';

const router = new express.Router();

router.route('/:id')
/** DELETE /api/v1/survey-items/:id - Remove survey items to trash */
  .delete(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.destroy),
    surveyItemsCtrl.destroy
  );

export default router;
