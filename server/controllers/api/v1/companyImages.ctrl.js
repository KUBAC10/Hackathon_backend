// services
import CloudinaryUploader from '../../../services/CloudinaryUploader';

// models
import { CompanyImage } from '../../../models';

/** POST /api/v1/company-images/ - Upload company image */
async function create(req, res, next) {
  try {
    const { name } = req.body;

    // create CompanyImage
    const companyImage = new CompanyImage.model({
      name,
      company: req.user.companyId,
    });

    // get encoded file data
    const encodedFile = CloudinaryUploader
      .encodeImage(req.file);

    // upload image to cloudinary
    const cloudinaryResponse = await CloudinaryUploader
      .uploadImage({
        company: req.scopes.company,
        encodedFile,
        entity: companyImage,
        actionName: 'companyImage'
      });

    companyImage.img = cloudinaryResponse;

    // set req user for createdBy, updatedBy fields
    companyImage._req_user = { _id: req.user._id };

    const reloadedDoc = await companyImage.save();

    return res.json(reloadedDoc);
  } catch (e) {
    return next(e);
  }
}

export default { create };

