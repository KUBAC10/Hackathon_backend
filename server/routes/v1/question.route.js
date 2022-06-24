import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/questions';

// ctrl
import questionsCtrl from '../../controllers/api/v1/questions.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';
import templateMaker from '../../controllers/access/templateMaker';

const router = new express.Router();

router.route('/')
/** POST /api/v1/questions - Create new question */
  .post(
    accessControl(powerUser('team'), teamUser('team'), templateMaker()),
    validate(paramValidation.create),
    questionsCtrl.create
  );

router.route('/:id')
/** PUT /api/v1/questions/:id - Update question item */
  .put(
    accessControl(powerUser(), teamUser('team'), templateMaker()), // TODO check admin scopes
    validate(paramValidation.update),
    questionsCtrl.update
  );

router.route('/:id/translate')
/** PUT /api/v1/questions/:id/translate - Translate question and items to new language */
  .put(
    accessControl(powerUser(), teamUser('team'), templateMaker()), // TODO check admin scopes
    validate(paramValidation.translate),
    questionsCtrl.translateQuestion
  );

router.route('/:id/remove-translation')
/** POST /api/v1/questions/:id/remove-translation - Remove translation from question and items */
  .post(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.removeTranslation),
    questionsCtrl.removeTranslation
  );

router.route('/:id')
/** DELETE /api/v1/questions/:id - Remove question to trash */
  .delete(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.destroy),
    questionsCtrl.destroy
  );

router.route('/:id/surveys')
  /** GET /api/v1/questions/:id/surveys - return surveys by question */
  .get(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.questionSurveys),
    questionsCtrl.questionSurveys
  );

router.route('/:id/clone-from-survey')
/** POST /api/v1/questions/:id/clone-from-survey - clones question from survey with added General/Trend type */
  .post(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.questionCloneFromSurvey),
    questionsCtrl.questionCloneFromSurvey
  );

router.route('/:id/custom-answers')
  /** GET /api/v1/questions/:id/custom-answers - return custom answers by trend question */
  .get(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.customAnswers),
    questionsCtrl.customAnswers
  );

export default router;
