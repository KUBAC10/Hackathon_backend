import express from 'express';
import passport from 'passport';

// config
import config from '../../../config/env';

// validate
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v2/surveys';

// ctrl
import surveyCtrl from '../../controllers/api/v2/surveys.ctrl';

// access
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';

const router = new express.Router();

router.route('/')
  /** GET /api/v2/surveys - Show list of surveys */
  .get(
    passport.authenticate('bearer', { session: false }),
    validate(paramValidation.list),
    surveyCtrl.list
  );

router.route('/:id')
  /** GET /api/v2/surveys/:id - Show specific survey */
  .get(
    passport.authenticate('bearer', { session: false }),
    validate(paramValidation.show),
    surveyCtrl.show
  );

router.route('/:id/first-question-html')
  /** GET /api/v2/surveys/:id/first-question-html - Get first question of survey in html */
  .get(
    config.env === 'development' || config.authBasicUsername // TODO remove
      ? accessControl(powerUser())
      : passport.authenticate('bearer', { session: false }),
    validate(paramValidation.firstQuestionHtml),
    surveyCtrl.firstQuestionHtml
  );

router.route('/:id/first-question-html/jwt')
  /** GET /api/v2/surveys/:id/first-question-html/jtw
   * - Get first question of survey in html - JWT AUTH */
  .get(
    accessControl(powerUser()),
    validate(paramValidation.firstQuestionHtml),
    surveyCtrl.firstQuestionHtml
  );

export default router;
