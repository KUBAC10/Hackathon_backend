import multer from 'multer';
import express from 'express';
import httpStatus from 'http-status';

// ctrl
import companyImageCtrl from '../../controllers/api/v1/companyImages.ctrl';

// access control
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

// helpers
import APIMessagesExtractor from '../../services/APIMessagesExtractor';

// init multer
const memoryStorage = multer.memoryStorage();
const uploader = multer({
  storage: memoryStorage,
  limits: { fileSize: 1000 * 1000 * 2, files: 1 }, // Max file size - 2MB
}).single('image');

const handleUpload = async (req, res, next) => {
  if (req.file && req.body.name) {
    next();
  } else {
    const message = {};
    const { lang } = req.cookies;
    if (!req.file) message.image = await APIMessagesExtractor.getError(lang, 'company.imageIsRequired');
    if (!req.body.name) message.name = await APIMessagesExtractor.getError(lang, 'global.isRequired');
    res.status(httpStatus.BAD_REQUEST).send({ message });
  }
};

const router = new express.Router();

router.route('/')
/** POST /api/v1/company-images - Upload company image */
  .post(
    accessControl(powerUser(), teamUser()),
    uploader,
    handleUpload,
    companyImageCtrl.create
  );

export default router;
