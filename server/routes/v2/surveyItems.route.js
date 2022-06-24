import express from 'express';
import passport from 'passport';

import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v2/surveyItems';

// ctrl
import surveyItemsCtrl from '../../controllers/api/v2/surveyItems.ctrl';

const router = new express.Router();

router.route('/:id')
/** GET /api/v2/survey-items/:id - Show specific question */
  .get(
    passport.authenticate('bearer', { session: false }),
    validate(paramValidation.show),
    surveyItemsCtrl.show
  );

router.route('/:id/generate-links')
/** POST /api/v2/survey-items/:id/generate-links - Generate answer links */
  .post(
    passport.authenticate('bearer', { session: false }),
    validate(paramValidation.generateLinks),
    surveyItemsCtrl.generateLinks
  );

export default router;
