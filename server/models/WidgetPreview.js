import keystone from 'keystone';
import path from 'path';
import fs from 'fs';

// helpers
import removeFile from '../helpers/removeFile';

import { widgetTypes } from './Widget';

const Types = keystone.Field.Types;

const imgStorage = new keystone.Storage({
  adapter: keystone.Storage.Adapters.FS,
  fs: {
    path: './public/uploads/widget-previews',
    publicPath: '/uploads/widget-previews/',
  },
  schema: {
    url: true
  },
});

/**
 * WidgetPreview Model
 * ===========
 */

const WidgetPreview = new keystone.List('WidgetPreview', {
  track: true,
  defaultSort: '-createdAt'
});

WidgetPreview.add({
  name: {
    type: String,
    initial: true,
    required: true
  },
  description: {
    type: String,
    initial: true
  },
  img: {
    type: Types.File,
    storage: imgStorage
  },
  widgetCategory: {
    type: Types.Relationship,
    ref: 'WidgetCategory',
    initial: true,
    many: true
  },
  parent: {
    type: Types.Relationship,
    ref: 'WidgetPreview'
  },
  // customization
  type: {
    type: Types.Select,
    options: widgetTypes
  },
  size: {
    type: Number
  },
  chart: {
    type: Boolean
  },
  dynamics: {
    type: Boolean
  },
  lists: {
    type: Boolean
  },
  completion: {
    type: Boolean
  },
  response: {
    type: Boolean
  },
  overallEngagementScore: {
    type: Boolean
  },
  topFive: {
    type: Boolean
  },
  withSubDrivers: {
    type: Boolean
  }
});

WidgetPreview.schema.virtual('children', {
  ref: 'WidgetPreview',
  localField: '_id',
  foreignField: 'parent'
});


WidgetPreview.schema.post('init', function () {
  this._oldImg = this.toObject().img;
});

WidgetPreview.schema.pre('save', function (next) {
  if (this.isModified('img') && this._oldImg && this._oldImg.url) {
    removeFile(this._oldImg.url, next);
  } else {
    next();
  }
});

WidgetPreview.schema.post('remove', (item) => {
  if (item.img && item.img.url) removeFile(item.img.url, console.error);
});

// apply image
WidgetPreview.schema.methods.applyImage = async function (filename) {
  try {
    // copy image from static to public folder
    fs.copyFileSync(
      path.join(__dirname, `../../../static/widget-previews/${filename}.png`),
      path.join(__dirname, `../../../public/uploads/widget-previews/${filename}.png`)
    );

    this.img = {
      filename,
      path: '/public/uploads',
      url: `/uploads/widget-previews/${filename}.png`,
    };
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Registration
 */
WidgetPreview.defaultColumns = 'name description widgetCategory';
WidgetPreview.register();

export default WidgetPreview;
