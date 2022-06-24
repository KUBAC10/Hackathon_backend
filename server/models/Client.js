import keystone from 'keystone';

const Types = keystone.Field.Types;

/**
 * Client Model
 * ============
 */

const Client = new keystone.List('Client', {
  track: true,
  defaultSort: '-createdAt'
});

Client.add({
  name: {
    type: String,
    initial: true,
    required: true
  },
  clientId: {
    type: String,
    initial: true,
    required: true,
    note: 'OAuth2 Client ID for client credentials grant type'
  },
  clientSecret: {
    type: String,
    initial: true,
    required: true,
    note: 'OAuth2 Client Secret for client credentials grant type'
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true,
    required: true
  },
});

// TODO: Remove all access tokens
/**
 * Registration
 */
Client.defaultColumns = 'name clientId company';
Client.register();

export default Client;
