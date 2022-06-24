import crypto from 'crypto';
import keystone from 'keystone';

/**
 * Access Token Model
 * ==================
 */

const Types = keystone.Field.Types;

const AccessToken = new keystone.List('AccessToken', {
  track: true,
  defaultSort: '-createdAt'
});

AccessToken.add({
  token: {
    type: String,
    initial: true,
    required: true,
    noedit: true,
    note: 'Generated hex'
  },
  client: {
    type: Types.Relationship,
    ref: 'Client',
    initial: true,
    // required: true
  },
  expiredAt: {
    type: Types.Datetime,
    initial: true,
    // required: true,
    // noedit: true
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true,
    required: true
  },
  survey: {
    type: Types.Relationship,
    ref: 'Survey',
    initial: true,
  }
});

// generate new token
AccessToken.schema.statics.generateToken = function () {
  return crypto.randomBytes(30).toString('hex');
};

/**
 * Registration
 */
AccessToken.defaultColumns = 'client token expiredAt';
AccessToken.register();

export default AccessToken;
