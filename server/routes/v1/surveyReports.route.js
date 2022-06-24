import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/surveyReports';

// ctrl
import surveyReportsCtrl from '../../controllers/api/v1/surveyReports.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/data')
  /** GET /api/v1/survey-reports/data - get report data */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.data),
    surveyReportsCtrl.data
  );

router.route('/')
  /** GET /api/v1/survey-reports - get list of survey reports */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.list),
    surveyReportsCtrl.list
  )
  /** POST /api/v1/survey-reports - create survey report */
  .post(
    accessControl(powerUser('team'), teamUser('team')),
    validate(paramValidation.create),
    surveyReportsCtrl.create
  );

router.route('/:id')
  /** PUT /api/v1/survey-reports/:id - update survey report */
  .put(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.update),
    surveyReportsCtrl.update
  )
  /** DELETE /api/v1/survey-reports/:id - remove survey report */
  .delete(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.destroy),
    surveyReportsCtrl.destroy
  );

router.route('/:id/clone')
  /** POST /api/v1/survey-reports/:id/clone - clone survey report */
  .post(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.cloneReport),
    surveyReportsCtrl.cloneReport
  );

router.route('/:id/get-text-answers-list')
  /** POST /api/v1/survey-reports/:id/get-text-answers-list - get list of text or custom answers */
  .post(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.getTextAnswersList),
    surveyReportsCtrl.getTextAnswersList
  );

router.route('/:surveyReport/survey-item/:surveyItem')
  /** POST /api/v1/survey-reports/:surveyReport/survey-item/:surveyItem */
  .post(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.updateItem),
    surveyReportsCtrl.updateItem
  );

export default router;
