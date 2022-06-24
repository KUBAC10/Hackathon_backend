import _ from 'lodash';
import uuid from 'uuid/v4';
import DataURI from 'datauri';
import cloudinary from '../../config/cloudinary';

class CloudinaryUploader {
  constructor() {
    this.cloudinary = cloudinary.v2;
    this.datauri = new DataURI();

    // Define cloudinary image path for each action
    this.UPLOAD_FOLDERS = {
      companyLogo: 'logo',
      companyImage: 'company-images',
      surveyLogo: 'logo',
      surveyBackground: 'background',
      content: 'content',
      surveyPreview: 'survey-preview',
      avatar: 'user-avatar',
      reportLogo: 'report-logo',
      reportCover: 'report-cover',
      teamLogo: 'team-logo',
      questionItem: 'question-item',
      widgetPreview: 'widget-preview'
    };
  }

  encodeImage = file => this.datauri.format(file.mimetype, file.buffer).content;

  uploadImage = (options = {}) => {
    const { company, encodedFile, actionName, entity } = options;

    return new Promise((resolve, reject) => {
      this.cloudinary.uploader.upload(encodedFile, {
        public_id: `${company}/${this.UPLOAD_FOLDERS[actionName]}/${entity._id}/${uuid()}`
      }, (err, result) => {
        if (err) reject(err);

        const imageData = _.pick(result, [
          'public_id', 'version', 'signature',
          'width', 'height', 'format',
          'resource_type', 'url', 'secure_url'
        ]);

        resolve(imageData);
      });
    });
  };

  cleanUp = (options = {}) => {
    const { public_id } = options;

    return new Promise((resolve, reject) => {
      this.cloudinary.uploader.destroy(public_id, {}, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });
  }
}

const cloudinaryUploader = new CloudinaryUploader();

export default cloudinaryUploader;
