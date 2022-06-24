import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/drafts';

// ctrl
import draftsCtrl from '../../controllers/api/v1/drafts.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';
import templateMaker from '../../controllers/access/templateMaker';

const router = new express.Router();

router.route('/')
  // POST /api/v1/drafts - init draft
  .post(
    accessControl(powerUser('team'), teamUser('team'), templateMaker()),
    validate(paramValidation.create),
    draftsCtrl.create
  );

router.route('/:id')
  // PUT /api/v1/drafts/:id - update survey draft
  .put(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.update),
    draftsCtrl.update
  );

router.route('/:id')
  // GET /api/v1/drafts - show related to draft entities
  .get(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.show),
    draftsCtrl.show
  );

router.route('/convert-question')
  // POST /api/v1/drafts/convert-question - convert trend question to regular
  .post(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.convertQuestion),
    draftsCtrl.convertQuestion
  );

router.route('/clone-survey-section')
  // POST /api/v1/drafts/clone-survey-section - clone survey section
  .post(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.cloneSurveySection),
    draftsCtrl.cloneSurveySection
  );

router.route('/clone-survey-item')
  // POST /api/v1/drafts/clone-survey-item - clone survey item
  .post(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.cloneSurveyItem),
    draftsCtrl.cloneSurveyItem
  );

router.route('/clone-content-item')
// POST /api/v1/drafts/clone-content-item - clone content item
  .post(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.cloneContentItem),
    draftsCtrl.cloneContentItem
  );

router.route('/clone-driver')
  // POST /api/v1/drafts/clone-driver - clone pulse survey driver
  .post(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.cloneDriver),
    draftsCtrl.cloneDriver
  );

router.route('/move-survey-item')
  // POST /api/v1/drafts/move-survey-item - edit related to draft entities
  .post(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.moveSurveyItem),
    draftsCtrl.moveSurveyItem
  );

router.route('/divide/:id')
  // POST /1pi/v1/drafts/divide/:id - move existing survey item content to new survey item
  .post(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.divide),
    draftsCtrl.divide
  );

router.route('/switch-page/:id')
// POST /api/v1/drafts/switch-page/:id - switch default start/end page
  .post(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.switchPage),
    draftsCtrl.switchPage
  );

router.route('/:id')
  // POST /api/v1/drafts/:id - edit related to draft entities
  .post(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.edit),
    draftsCtrl.edit
  );

router.route('/apply/:id')
  // POST /api/v1/drafts/apply/:id - apply draft
  .post(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.apply),
    draftsCtrl.apply
  );

router.route('/remove/:id')
  // POST /api/v1/drafts/remove/:id - remove draft
  .post(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.remove),
    draftsCtrl.remove
  );

router.route('/check-translation/:id')
  // GET /api/v1/drafts/check-translation/:id - count fields to translate
  .get(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.checkTranslation),
    draftsCtrl.checkTranslation
  );


router.route('/count-score/:id')
  // GET /api/v1/drafts/count-score/:id - count maximum score
  .get(
    accessControl(powerUser(), teamUser('team'), templateMaker()),
    validate(paramValidation.countScorePoints),
    draftsCtrl.countScorePoints
  );

export default router;
