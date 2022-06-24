import keystone from 'keystone';
import uuid from 'uuid/v4';
import request from 'superagent';
import hmacSHA256 from 'crypto-js/hmac-sha256';
import Base64 from 'crypto-js/enc-base64';

import {
  WebhookHistory
} from './index';

export const webhookTypes = ['optionSelected', 'surveyCompleted', '*'];

const Types = keystone.Field.Types;

/**
 * Webhook Model
 * =============
 */
const Webhook = new keystone.List('Webhook', {
  track: true,
  defaultSort: '-createdAt'
});

Webhook.add({
  type: {
    type: Types.Select,
    options: webhookTypes,
    initial: true,
    default: '*',
    required: true
  },
  url: {
    type: String,
    initial: true,
    required: true
  },
  secret: {
    type: String
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true,
    required: true
  },
});

// generate secret
Webhook.schema.pre('save', function (next) {
  if (this.isNew && !this.secret) {
    this.secret = uuid();
  }
  next();
});

// process webhook data
Webhook.schema.methods.processData = async function (data = {}, eventType, callback) {
  let res;
  let dataJSON;
  try {
    dataJSON = JSON.stringify(data);

    const signHash = Base64.stringify(hmacSHA256(dataJSON, this.secret));

    res = await request
      .post(this.url)
      .set('X-API-SIGNATURE', signHash)
      .send(data);

    return res;
  } catch (e) {
    return callback ? callback(e) : console.error(e);
  } finally {
    // save history
    await WebhookHistory.model.create({
      eventType,
      data: dataJSON,
      status: res ? res.status : 'error',
      url: this.url,
      company: this.company,
      webhook: this._id
    });
  }
};

/**
 * Registration
 */
Webhook.defaultColumns = 'type url company createdAt';
Webhook.register();

export default Webhook;
