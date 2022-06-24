import httpStatus from 'http-status';

// services
import { CloudinaryUploader } from '../../../services';

// models
import {
  Company,
  Survey
} from '../../../models';
import { hasAccess } from '../../helpers';

/** POST /api/v1/uploads/company/logo */
async function companyLogo(req, res, next) {
  try {
    const company = await Company.model
      .findById(req.user.companyId);

    if (!company) return res.sendStatus(httpStatus.NOT_FOUND);

    // clear old logo
    if (company.logo && company.logo.public_id) {
      await CloudinaryUploader.cleanUp({ public_id: company.logo.public_id });
    }

    // get encoded file data
    const encodedFile = CloudinaryUploader
      .encodeImage(req.file);

    // upload image to cloudinary
    const cloudinaryResponse = await CloudinaryUploader
      .uploadImage({
        encodedFile,
        company: req.user.companyId,
        entity: company,
        actionName: 'companyLogo'
      });

    // set cloudinary data to company logo field
    Object.assign(company.logo, cloudinaryResponse);
    const reloadedDoc = await company.save();

    return res.json({ logo: reloadedDoc.logo });
  } catch (e) {
    return next(e);
  }
}

/** POST /api/v1/uploads/surveys/:id/logo - Upload survey logo */
async function surveyLogo(req, res, next) {
  try {
    const { id } = req.params;
    const query = {
      _id: id
    };

    const survey = await Survey.model
      .findOne(query);

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // clear old logo
    if (survey.logo && survey.logo.public_id) {
      await CloudinaryUploader.cleanUp({ public_id: survey.logo.public_id });
    }

    // get encoded file data
    const encodedFile = CloudinaryUploader
      .encodeImage(req.file);

    // upload image to cloudinary
    const cloudinaryResponse = await CloudinaryUploader
      .uploadImage({
        encodedFile,
        company: survey.company._id,
        entity: survey,
        actionName: 'surveyLogo'
      });

    // set cloudinary data to survey logo field
    Object.assign(survey.logo, cloudinaryResponse);
    const reloadedDoc = await survey.save();

    return res.json({ logo: reloadedDoc.logo });
  } catch (e) {
    return next(e);
  }
}

export default {
  companyLogo,
  surveyLogo
};
