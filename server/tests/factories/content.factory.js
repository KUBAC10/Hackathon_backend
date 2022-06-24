// models
import {
  Content
} from '../../models';

export default async function (options = {}) {
  return await Content.model.create({
    nameShort: options.nameShort || 'en'
  });
}
