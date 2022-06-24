import keystone from 'keystone';
import uniqueValidator from 'mongoose-unique-validator';

// config
import { localizeField } from '../../config/localization';

/**
 * Country Model
 * =============
 */
const Country = new keystone.List('Country', {
  nodelete: true,
  track: true,
  defaultSort: 'name'
});

Country.add(
  {
    sortableId: {
      type: Number,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      uniqueCaseInsensitive: true,
      index: {
        unique: true,
        partialFilterExpression: { name: { $type: 'string' } }
      }
    },
    show: {
      type: Boolean,
      default: false,
      initial: true,
      note: 'Flag for filter on client-side'
    },
    code: {
      type: String
    }
  }, 'Localization', {
    localization: {
      name: localizeField('general.name')
    }
  }
);

Country.schema.plugin(uniqueValidator, { message: 'This {PATH} has already been taken' });

/**
 * Registration
 */
Country.defaultColumns = 'name createdAt';
Country.register();

export default Country;
