import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/translation';

// ctrl
import translationCtrl from '../../controllers/api/v1/translation.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';
import templateMaker from '../../controllers/access/templateMaker';

const router = new express.Router();

router.route('/')
  /** GET /api/v1/translation - get list of languages */
  .get(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.list),
    translationCtrl.list
  );

router.route('/:id')
  /** POST /api/v1/translation/:id - translate survey to selected lang */
  .post(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.translateSurvey),
    translationCtrl.translateSurvey
  )
  /** GET /api/v1/translation/:id - get field translation */
  .get(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.translateField),
    translationCtrl.translateField
  );

router.route('/:id/remove')
  /** GET /api/v1/translation/:id/remove - remove translation */
  .get(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.removeTranslation),
    translationCtrl.removeTranslation
  );

router.route('/:id/switch')
/** GET /api/v1/translation/:id/switch - switch default language */
  .get(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.switchDefaultLanguage),
    translationCtrl.switchDefaultLanguage
  );

export default router;
