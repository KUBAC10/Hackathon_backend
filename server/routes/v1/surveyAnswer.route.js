import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/surveyAnswers';

// ctrl
import surveyAnswersCtrl from '../../controllers/api/v1/surveyAnswers.ctrl';

// access helper
import userAuthentication from '../../helpers/userAuthentication';

const router = new express.Router();

router.route('/')
/** POST /api/v1/survey-answers - Find or create new survey result */
  .post(
    userAuthentication(),
    validate(paramValidation.create),
    surveyAnswersCtrl.create
  )
  /** PUT /api/v1/survey-answers - Add answers(survey result items) to existing survey result */
  .put(
    validate(paramValidation.update),
    surveyAnswersCtrl.update
  )
  /** GET /api/v1/survey-answers - Return valid survey structure
   * for answer process by current state of survey result */
  .get(
    userAuthentication(),
    validate(paramValidation.show),
    surveyAnswersCtrl.show
  );

router.route('/step-back')
/** GET /api/v1/survey-answers/step-back - Return previous section */
  .get(
    validate(paramValidation.stepBack),
    surveyAnswersCtrl.stepBack
  );

router.route('/restart-survey')
/** GET /api/v1/survey-answers/restart-survey - Return to the first section */
  .get(
    validate(paramValidation.restartSurvey),
    surveyAnswersCtrl.restartSurveyAnswer
  );

export default router;
