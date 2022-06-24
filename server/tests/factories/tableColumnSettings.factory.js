// models
import {
  TableColumnSettings
} from '../../models';

export default async function (options = {}) {
  return await TableColumnSettings.model.create({
    contacts: options.contacts
  });
}
