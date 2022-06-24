import keystone from 'keystone';

const Types = keystone.Field.Types;

/**
 * Consent Model
 * =============
 */

const Consent = new keystone.List('Consent', {
  track: true,
  defaultSort: '-createdAt'
});

Consent.add({
  user: {
    type: Types.Relationship,
    ref: 'User',
    initial: true,
    required: true
  },
  survey: {
    type: Types.Relationship,
    ref: 'Survey',
    initial: true,
    required: true
  }
});

/**
 * Registration
 */
Consent.defaultColumns = 'survey user';
Consent.register();

export default Consent;
