import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/countries';

// ctrl
import countriesCtrl from '../../controllers/api/v1/countries.ctrl';

const router = new express.Router();

router.route('/')
/** GET /api/v1/countries - Show all countries from database */
  .get(validate(paramValidation.list), countriesCtrl.list);

export default router;
