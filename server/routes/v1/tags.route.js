import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/tags';

// ctrl
import tagsCtrl from '../../controllers/api/v1/tags.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/:id/add-contacts')
  /** POST /api/v1/tags/:id/add-contacts - Mass add contacts to tag */
  .post(
    accessControl(powerUser(), teamUser()),
    validate(paramValidation.addContacts),
    tagsCtrl.addContacts
  );

router.route('/by-survey')
  /** GET /api/v1/tags/by-survey - return list of tags  */
  .get(
    accessControl(powerUser(), teamUser()),
    validate(paramValidation.tagsBySurvey),
    tagsCtrl.tagsBySurvey
  );

export default router;
