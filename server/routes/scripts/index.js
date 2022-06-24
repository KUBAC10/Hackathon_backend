import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/scripts/embedSurvey';

// ctrl
import embedScriptCtrl from '../../controllers/scripts/embedSurvey.ctrl';

const router = new express.Router();

router.route('/embed-survey')
  /** GET /scripts/embed-survey - Return embed survey script */
  .get(
    validate(paramValidation.show),
    embedScriptCtrl.show
  );

export default router;
