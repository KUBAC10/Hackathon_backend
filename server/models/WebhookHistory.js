import keystone from 'keystone';

const Types = keystone.Field.Types;

/**
 * WebhookHistory Model
 * =============
 */
const WebhookHistory = new keystone.List('WebhookHistory', {
  track: true,
  defaultSort: '-createdAt'
});

WebhookHistory.add({
  data: {
    type: Types.Code,
    language: 'json'
  },
  status: {
    type: String
  },
  url: {
    type: String
  },
  webhook: {
    type: Types.Relationship,
    ref: 'Webhook',
    initial: true,
    required: true
  },
  eventType: {
    type: String
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true,
    required: true
  },
});

/**
 * Registration
 */
WebhookHistory.defaultColumns = 'type url company createdAt';
WebhookHistory.register();

export default WebhookHistory;
