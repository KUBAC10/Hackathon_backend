import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/tableau';

// ctrl
import tableauCtrl from '../../controllers/api/v1/tableau.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';

const router = new express.Router();

router.route('/generate-token')
  // GET /api/v1/tableau/generate-token - generate access token for tableau
  .get(
    accessControl(powerUser()),
    validate(paramValidation.generateToken),
    tableauCtrl.generateToken
  );

// GET /api/v1/tableau/survey-by-token/:token - get survey base data by token
router.route('/survey-by-token/:token')
  .get(
    validate(paramValidation.data),
    tableauCtrl.getSurveyDataByToken
  );

router.route('/:token')
  // GET /api/v1/tableau/:token - return data for tableau by access token
  .get(
    validate(paramValidation.data),
    tableauCtrl.data
  );

export default router;
