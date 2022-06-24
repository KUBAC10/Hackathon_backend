// models
import {
  GlobalConfig
} from '../../models';

// factories
import {
  contentFactory
} from './index';

export default async function (options = {}, onlyId) {
  return await GlobalConfig.model.create({
    name: options.name || 'Global config',
    adminEmail: options.adminEmail || 'admin@screver.com',
    primaryContent: options.primaryContent
      || await contentFactory({}).then(i => (onlyId ? i._id : i))
  });
}
