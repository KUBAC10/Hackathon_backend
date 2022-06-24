import express from 'express';

import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/webhookTest';

// ctrl
import webhookCtrl from '../../controllers/api/v1/testWebhook.ctrl';

const router = new express.Router();

router.route('/')
/** POST /api/v1/test-webhook - Test webhook */
  .post(
    validate(paramValidation.webhook),
    webhookCtrl.webhook
  );

export default router;
