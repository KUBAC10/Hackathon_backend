import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/globalTemplates';

// ctrl
import globalTemplateCtrl from '../../controllers/api/v1/globalTeamplte.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import templateMaker from '../../controllers/access/templateMaker';

const router = new express.Router();

router.route('/')
/** GET /api/v1/global-templates - list of templates created by templateMaker */
  .get(
    accessControl(templateMaker()),
    validate(paramValidation.list),
    globalTemplateCtrl.list
  );

router.route('/:id')
/** GET /api/v1/global-templates/:id - show global template */
  .get(
    accessControl(templateMaker()),
    validate(paramValidation.show),
    globalTemplateCtrl.show
  );

export default router;
