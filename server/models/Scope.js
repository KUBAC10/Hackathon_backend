import keystone from 'keystone';

const Types = keystone.Field.Types;

/**
 * Scope Model
 * ===========
 */

const Scope = new keystone.List('Scope', {
  track: true
});

Scope.add({
  companies: {
    type: Types.Relationship,
    ref: 'Company',
    many: true,
  },
  type: {
    type: Types.Select,
    options: 'company, team, global',
    initial: true,
    required: true,
    default: 'team'
  },
});

/**
 * Registration
 */
Scope.register();

export default Scope;
