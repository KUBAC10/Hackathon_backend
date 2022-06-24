import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/advancedAnalyze';

// ctrl
import advancedAnalyzeCtrl from '../../controllers/api/v1/advancedAnalyze.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/surveys/:id/replies')
  /** GET /api/v1/advanced-analyze/surveys/:id/replies - get analytic by survey responses */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.replies),
    advancedAnalyzeCtrl.replies
  );

router.route('/surveys/:id/locations')
  /** GET /api/v1/advanced-analyze/surveys/:id/locations - get location analytic */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.locations),
    advancedAnalyzeCtrl.locations
  );

router.route('/surveys/:id/devices')
  /** GET /api/v1/advanced-analyze/surveys/:id/devices - get device analytic */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.devices),
    advancedAnalyzeCtrl.devices
  );

router.route('/surveys/:id/nps-statistic')
  /** GET /api/v1/advanced-analyze/surveys/:id/nps-statistic - nps questions statistic */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.npsStatistic),
    advancedAnalyzeCtrl.npsStatistic
  );

router.route('/surveys/:id/nps-comments')
  /** GET /api/v1/advanced-analyze/surveys/:id/nps-comments - nps questions comments */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.npsComments),
    advancedAnalyzeCtrl.npsComments
  );

router.route('/surveys/:id/dependency')
  /** GET /api/v1/advanced-analyze/surveys/:id/dependency - correlation analyze */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.dependency),
    advancedAnalyzeCtrl.dependency
  );

router.route('/surveys/:id/insights')
  /** GET /api/v1/advanced-analyze/surveys/:id/insights - return analytic notifications */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.insights),
    advancedAnalyzeCtrl.insights
  );

router.route('/:surveyId/driver/:pulseSurveyDriverId')
  /** GET /api/v1/advanced-analyze/:surveyId/driver/:pulseSurveyDriverId - pulse summary */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.driverReport),
    advancedAnalyzeCtrl.driverReport
  );

router.route('/surveys/:id/pulse-summary')
  /** GET /api/v1/advanced-analyze/surveys/:id/pulse-summary - pulse summary */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.pulseSummary),
    advancedAnalyzeCtrl.pulseSummary
  );

router.route('/surveys/:id/pulse-drivers')
/** GET /api/v1/advanced-analyze/surveys/:id/pulse-drivers
 *  - return list of survey pulse drivers */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.getPulseSurveyDrivers),
    advancedAnalyzeCtrl.getPulseSurveyDrivers
  );


export default router;
