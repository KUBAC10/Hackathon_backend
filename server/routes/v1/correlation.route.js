import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/correlation';

// ctrl
import correlationCtrl from '../../controllers/api/v1/correlation.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/:id')
/** GET /api/v1/correlation/:id - Return correlation coefficient */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.calculateCorrelation),
    correlationCtrl.calculateCorrelation
  );

export default router;
