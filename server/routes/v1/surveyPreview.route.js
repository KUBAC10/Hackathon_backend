import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/surveyPreview';

// ctrl
import surveyPreviewCtrl from '../../controllers/api/v1/surveyPreview.ctrl';

// access control
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/')
/** GET /api/v1/survey-preview/ - Get list of tokens for preview survey result */
  .get(
    accessControl(powerUser(), teamUser()),
    validate(paramValidation.list),
    surveyPreviewCtrl.list
  )

  /** POST /api/v1/survey-preview/- Create token for preview survey result */
  .post(
    accessControl(powerUser(), teamUser()),
    validate(paramValidation.create),
    surveyPreviewCtrl.create
  );

router.route('/:id')
/** DELETE /api/v1/survey-preview/:id - Delete token for preview survey result */
  .delete(
    accessControl(powerUser(), teamUser('createdBy')),
    validate(paramValidation.destroy),
    surveyPreviewCtrl.destroy
  );

export default router;
