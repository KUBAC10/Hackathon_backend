import _ from 'lodash';
import CloudinaryUploader from '../services/CloudinaryUploader';

/**
 * Upload new image to cloudinary and if old image exist, delete it
 * @param  {object} props
 * @param  {object} [props.oldFile] - Object with old image from database
 * @param  {string} [props.newFile] - String with base64 of new image
 * @param  {object} [props.survey] - Survey data
 * @param  {string} [props.actionName] - Name for upload action
 * @return {object}
 */
export default async function cloudinaryUploadImage(props) {
  try {
    const { oldFile, newFile, survey, actionName } = props;

    // clear old image
    if (_.get(oldFile, 'public_id')) {
      await CloudinaryUploader.cleanUp({ public_id: oldFile.public_id });
    }

    // upload image to cloudinary
    if (!_.isEmpty(newFile)) {
      const cloudinaryResponse = await CloudinaryUploader
        .uploadImage({
          company: survey.company._id,
          encodedFile: newFile,
          entity: survey,
          actionName
        });
      return cloudinaryResponse;
    }
    return undefined;
  } catch (e) {
    return console.error(e);
  }
}
