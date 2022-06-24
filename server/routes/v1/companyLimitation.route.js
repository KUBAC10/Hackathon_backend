import express from 'express';

import companyLimitationsCtrl from '../../controllers/api/v1/companyLimitations.ctrl';

// access control
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';
import liteUser from '../../controllers/access/liteUser';

const router = new express.Router();

router.route('/')
  /** GET /api/v1/company-limitations - show current company limits */
  .get(
    accessControl(powerUser(), teamUser(), liteUser()),
    companyLimitationsCtrl.getLimits
  );

export default router;
