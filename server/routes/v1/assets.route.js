import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/assets';

// ctrl
import assetsCtrl from '../../controllers/api/v1/assets.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/survey-links-csv')
/** GET /api/v1/assets/survey-links-csv -
 * Generate CSV file with public survey links for each asset */
  .get(
    accessControl(powerUser('team'), teamUser('team')),
    validate(paramValidation.surveyLinksCSV),
    assetsCtrl.surveyLinksCSV
  );

export default router;
