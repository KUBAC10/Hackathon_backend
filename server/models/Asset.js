import keystone from 'keystone';

const Types = keystone.Field.Types;

/**
 * Asset Model
 * ===========
 */

const Asset = new keystone.List('Asset', {
  track: true,
  defaultSort: '-createdAt'
});

Asset.add({
  name: {
    type: String,
    initial: true,
    required: true
  },
  description: {
    type: String
  },
  team: {
    type: Types.Relationship,
    ref: 'Team',
    initial: true,
    required: true
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true,
    required: true
  },
  type: {
    type: Types.Select,
    options: 'location, product',
    initial: true,
    required: true
  }
});

/**
 * Registration
 */
Asset.defaultColumns = 'name description type company team';
Asset.register();

export default Asset;
