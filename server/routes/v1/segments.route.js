import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/segments';

// ctrl
import segmentsCtrl from '../../controllers/api/v1/segments.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/:id')
/** POST /api/v1/segments/:id - Return question reports data by range */
  .post(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.filters),
    segmentsCtrl.filter
  );

export default router;
