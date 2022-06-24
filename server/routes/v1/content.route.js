import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/contents';

// ctrl
import contentsCtrl from '../../controllers/api/v1/contents.ctrl';

const router = new express.Router();

router.route('/')
/** GET /api/v1/contents - Show content entity */
  .get(validate(paramValidation.show), contentsCtrl.show);

export default router;
