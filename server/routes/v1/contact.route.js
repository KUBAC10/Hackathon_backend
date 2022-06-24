import express from 'express';
import multer from 'multer';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

// ctrl
import contactsCtrl from '../../controllers/api/v1/contacts.ctrl';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/contacts';

// setup multer
const storage = multer.memoryStorage();
const uploader = multer({
  storage,
  limits: { fileSize: 1000 * 1000 * 5, files: 1 }, // Max file size - 5MB
  fileFilter: (req, file, cb) => {
    // TODO check if need to extend?
    const validMimeTypes = ['text/csv', 'application/vnd.ms-excel', 'text/x-csv'];
    return cb(null, validMimeTypes.includes(file.mimetype));
  }
}).single('csv');

const handleFileFormat = (req, res, next) => {
  if (req.file) {
    next();
  } else {
    res.status(422).send({ error: 'Invalid file format, expect CSV.' });
  }
};

const router = new express.Router();

router.route('/import/csv')
/** POST /api/v1/contacts/import/csv - Import contacts from CSV file */
  .post(
    accessControl(powerUser('team'), teamUser('team')),
    uploader,
    validate(paramValidation.importCSV),
    handleFileFormat,
    contactsCtrl.importCSV
  );

export default router;
