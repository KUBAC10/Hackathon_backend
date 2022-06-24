import express from 'express';
import multer from 'multer';
import paramValidation from '../../controllers/paramsValidation/v1/upload';
import validate from '../../controllers/paramsValidation/v1/validation';

// ctrl
import uploadsCtrl from '../../controllers/api/v1/uploads.ctrl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

// access control
import userAuthentication from '../../helpers/userAuthentication';
import accessControl from '../../helpers/accessControl';

// init multer
const memoryStorage = multer.memoryStorage();
const memoryUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 1000 * 1000 * 2, files: 1 } // Max file size - 2MB
});

const router = new express.Router();

router.route('/company/logo')
/** POST /api/v1/uploads/company/logo - Upload company logo */
  .post(
    userAuthentication(true),
    memoryUpload.single('logo'),
    uploadsCtrl.companyLogo
  );

router.route('/surveys/:id/logo')
/** POST /api/v1/uploads/surveys/:id/logo - Upload survey logo */
  .post(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.uploadSurveyLogo),
    memoryUpload.single('logo'),
    uploadsCtrl.surveyLogo
  );

export default router;
