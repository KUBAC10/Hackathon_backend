import keystone from 'keystone';

// services
import CloudinaryUploader from '../services/CloudinaryUploader';

const Types = keystone.Field.Types;

/**
 * CompanyImage Model
 * ==============
 */
const CompanyImage = new keystone.List('CompanyImage', {
  track: true,
  defaultSort: '-createdAt'
});

CompanyImage.add(
  {
    name: { type: String },
    img: {
      type: Types.CloudinaryImage,
      autoCleanup: true,
      initial: true,
      folder(item) {
        /* istanbul ignore next */
        return `${item.company}/company-images/${item._id}`;
      }
    },
    company: {
      type: Types.Relationship,
      ref: 'Company',
      initial: true
    }
  }
);

// Clear Cloudinary Image
/* istanbul ignore next */
CompanyImage.schema.pre('remove', async function (next) {
  try {
    if (this.img && this.img.public_id) {
      await CloudinaryUploader.cleanUp({ public_id: this.img.public_id });
    }

    next();
  } catch (e) {
    /* istanbul ignore next */
    next(e);
  }
});

/**
 * Registration
 */
CompanyImage.defaultColumns = 'name createdAt';
CompanyImage.register();

export default CompanyImage;
