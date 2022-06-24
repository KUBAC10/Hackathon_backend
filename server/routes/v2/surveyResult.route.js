import express from 'express';
import passport from 'passport';

import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v2/surveyResults';

// ctrl
import surveyResultCtrl from '../../controllers/api/v2/surveyResults.ctrl';

const router = new express.Router();

router.route('/remove-one')
/** DELETE /api/v2/survey-results - Delete specific survey result by id or email */
  .delete(
    passport.authenticate('bearer', { session: false }),
    validate(paramValidation.removeOne),
    surveyResultCtrl.removeOne
  );

router.route('/remove-array')
/** DELETE /api/v2/survey-results/remove-array - Delete results by idsArray */
  .delete(
    passport.authenticate('bearer', { session: false }),
    validate(paramValidation.removeArray),
    surveyResultCtrl.removeArray
  );

router.route('/remove-by-meta')
/** DELETE /api/v2/survey-results/remove-by-meta - Delete results by meta */
  .delete(
    passport.authenticate('bearer', { session: false }),
    validate(paramValidation.removeByMeta),
    surveyResultCtrl.removeByMeta
  );

router.route('/:id')
/** DELETE /api/v2/survey-results/:id - Delete result by id */
  .delete(
    passport.authenticate('bearer', { session: false }),
    validate(paramValidation.destroy),
    surveyResultCtrl.destroy
  );

export default router;
