import express from 'express';

import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/surveyResults';

// ctrl
import surveyResultsCtrl from '../../controllers/api/v1/surveyResults.ctrl';

const router = new express.Router();

router.route('/batch-remove')
/** DELETE /api/v1/survey-results/batch-remove - Delete results by idsArray */
  .delete(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.batchRemove),
    surveyResultsCtrl.batchRemove
  );

router.route('/recipients')
/** GET /api/v1/survey-results/recipients - get recipients results list */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.recipientResults),
    surveyResultsCtrl.recipientResults
  );

router.route('/recipients/:id')
  /** GET /api/v1/survey-results/recipients/:id - get recipients result */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.recipientResult),
    surveyResultsCtrl.recipientResult
  );

export default router;
