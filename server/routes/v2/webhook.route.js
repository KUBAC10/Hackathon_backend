import express from 'express';
import passport from 'passport';

import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v2/webhooks';

// ctrl
import webhookCtrl from '../../controllers/api/v2/webhook.ctrl';

const router = new express.Router();

router.route('/')
/** GET /api/v2/webhooks - Webhooks - list */
  .get(
    passport.authenticate('bearer', { session: false }),
    validate(paramValidation.list),
    webhookCtrl.list
  )

  /** POST /api/v2/webhooks - Webhooks - create */
  .post(
    passport.authenticate('bearer', { session: false }),
    validate(paramValidation.create),
    webhookCtrl.create
  );

router.route('/:id')
/** GET /api/v2/webhooks/:id - Webhooks - show */
  .get(
    passport.authenticate('bearer', { session: false }),
    validate(paramValidation.show),
    webhookCtrl.show
  )

  /** GET /api/v2/webhooks/:id - Webhooks - update */
  .put(
    passport.authenticate('bearer', { session: false }),
    validate(paramValidation.update),
    webhookCtrl.update
  )

  /** DELETE /api/v2/webhooks/:id - Webhooks - destroy */
  .delete(
    passport.authenticate('bearer', { session: false }),
    validate(paramValidation.destroy),
    webhookCtrl.destroy
  );

export default router;
