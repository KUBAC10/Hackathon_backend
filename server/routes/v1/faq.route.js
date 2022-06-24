import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/faq';

// ctrl
import faqCtrl from '../../controllers/api/v1/faq.ctrl';

const router = new express.Router();

router.route('/:urlName')
/** GET /api/v1/faq/:urlName Return FAQ article */
  .get(
    validate(paramValidation.show),
    faqCtrl.show
  );

export default router;
