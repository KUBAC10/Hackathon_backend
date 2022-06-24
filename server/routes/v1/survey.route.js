import express from 'express';
import multer from 'multer';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/surveys';

// ctrl
import surveyCtrl from '../../controllers/api/v1/surveys.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

// setup multer
const storage = multer.memoryStorage();
const uploader = multer({
  storage,
  limits: { fileSize: 1000 * 1000 * 3, files: 1 }, // Max file size - 3MB
  fileFilter: (req, file, cb) => {
    // TODO check if need to extend?
    const validMimeType = 'application/json';

    return cb(null, validMimeType === file.mimetype);
  }
}).single('json');

const handleFileFormat = (req, res, next) => {
  if (!req.file) {
    return res.status(422).send({ error: 'Invalid file format, expect JSON.' });
  }

  return next();
};

const router = new express.Router();

router.route('/:id/download-results-csv')
/** GET /api/v1/surveys/:id/download-results-csv - Download survey results in CSV */
  .get(
    accessControl(powerUser(), teamUser('team')), // TODO check admin scopes
    validate(paramValidation.downloadResultsCSV),
    surveyCtrl.downloadResultsCSV
  );

router.route('/:id/download-json')
  /** GET /api/v1/surveys/:id/download-json - export survey to json file */
  .get(
    accessControl(powerUser(), teamUser('team')),
    surveyCtrl.downloadJSON
  );

router.route('/upload-json')
  /** POST /api/v1/surveys/upload-json - import survey from json file */
  .post(
    accessControl(powerUser(), teamUser('team')),
    uploader,
    handleFileFormat,
    surveyCtrl.uploadJSON
  );

router.route('/by-token/:token')
/** GET /api/v1/surveys/by-token/:token - Return base survey by token */
  .get(
    validate(paramValidation.baseByToken),
    surveyCtrl.baseByToken
  );

router.route('/:companyUrlName/target/:token')
  /** GET /api/v1/surveys/:companyUrlName/target/:token - return survey base by target token */
  .get(
    validate(paramValidation.targetBase),
    surveyCtrl.targetBase
  );

router.route('/:id/count-fake-data')
  /** GET /api/v1/surveys/:id/count-fake-data - return fake data counter */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.countFakeData),
    surveyCtrl.countFakeData
  );

router.route('/:id/count-hidden-responses')
  /** GET /api/v1/surveys/:id/count-hidden-responses - return hidden responses counter */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.countHiddenResponses),
    surveyCtrl.countHiddenResponses
  );

router.route('/:id/tags')
  /** GET /api/v1/surveys/:id/tags - return tags list by survey campaigns */
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.tags),
    surveyCtrl.tags
  );

router.route('/:id/public-template')
  /** GET /api/v1/surveys/:id/public-template - return public template */
  .get(
    validate(paramValidation.publicTemplate),
    surveyCtrl.publicTemplate
  );

router.route('/:id/public-template-link')
  /** GET /api/v1/surveys/:id/public-template-link - return link for public template */
  .get(
    validate(paramValidation.publicTemplateLink),
    surveyCtrl.publicTemplateLink
  );

router.route('/:companyUrlName/:surveyUrlName')
/** GET /api/v1/surveys/:companyUrlName/:surveyUrlName - Return base public survey data */
  .get(
    validate(paramValidation.base),
    surveyCtrl.base
  );

router.route('/:id/generate-fake-data')
/** POST /api/v1/surveys/:id/generate-fake-data - Generate fake results from survey */
  .post(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.generateFakeData),
    surveyCtrl.generateFakeData
  );

router.route('/:id/remove-fake-data')
/** DELETE /api/v1/surveys/:id/remove-fake-data - Delete fake results from survey */
  .delete(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.removeFakeData),
    surveyCtrl.removeFakeData
  );

router.route('/:id')
/** DELETE /api/v1/surveys/:id - Remove survey to trash */
  .delete(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.destroy),
    surveyCtrl.destroy
  );

router.route('/:id/remove-logo')
/** PUT /api/v1/surveys/:id/remove-logo - Remove logo */
  .put(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.removeLogo),
    surveyCtrl.removeLogo
  );

export default router;
