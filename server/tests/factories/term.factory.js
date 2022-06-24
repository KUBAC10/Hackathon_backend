// models
import {
  Term
} from '../../models';

export default async function (options = {}) {
  return await Term.model.create({
    nameShort: options.nameShort || 'en'
  });
}
