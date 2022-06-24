import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/reports';

// ctrl
import reportsCtrl from '../../controllers/api/v1/reports.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/survey')
/** GET /api/v1/reports/survey - Return survey reports data by range */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.dataBySurvey),
    reportsCtrl.dataBySurvey
  );

router.route('/survey-stats')
/** GET /api/v1/reports/survey-stats - Return survey stats data by range */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.surveyStats),
    reportsCtrl.surveyStats
  );

router.route('/question')
/** GET /api/v1/reports/question - Return question reports data by range */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.dataByQuestion),
    reportsCtrl.dataByQuestion
  );

router.route('/fonts')
/** GET /api/v1/reports/fonts - Return fonts by language */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.fontsByLanguage),
    reportsCtrl.fontsByLanguage
  );

export default router;
