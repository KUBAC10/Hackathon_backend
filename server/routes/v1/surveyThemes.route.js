import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/surveyThemes';

// ctrl
import themeCtrl from '../../controllers/api/v1/surveyThemes.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/')
  /** GET /api/v1/survey-themes - get list of themes */
  .get(
    accessControl(powerUser(), teamUser()),
    validate(paramValidation.list),
    themeCtrl.list
  )
  /** POST /api/v1/survey-themes - create user theme */
  .post(
    accessControl(powerUser(), teamUser()),
    validate(paramValidation.create),
    themeCtrl.create
  );

router.route('/:id')
  /** GET /api/v1/survey-themes/:id - get theme */
  .get(
    accessControl(powerUser(), teamUser()),
    validate(paramValidation.show),
    themeCtrl.show
  )
  /** PUT /api/v1/survey-themes/:id - update theme */
  .put(
    accessControl(powerUser(), teamUser()),
    validate(paramValidation.update),
    themeCtrl.update
  )
  /** DELETE /api/v1/survey-themes/:id - delete theme */
  .delete(
    accessControl(powerUser(), teamUser()),
    validate(paramValidation.destroy),
    themeCtrl.destroy
  );

export default router;
