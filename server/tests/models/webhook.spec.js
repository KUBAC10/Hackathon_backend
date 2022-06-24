import chai, { expect } from 'chai';
import config from 'config/env';
import app from 'index'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  webhookFactory,
  companyFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

let webhook;
let company;

async function makeTestData() {
  company = await companyFactory({});

  webhook = await webhookFactory({
    company,
    secret: 'webhooksecret123',
    url: `http://localhost:${config.port}/api/v1/test-webhook`
  });
}

describe('Webhook Model', () => {
  describe('method: processData', () => {
    before(cleanData);

    before(makeTestData);

    it('should response success with valid test data', async () => {
      const validData = { x: 'test', y: 1 };
      const res = await webhook.processData(validData);

      expect(res.body.message).to.be.eq('valid');
    });

    it('should response message: "invalid" with invalid data', async () => {
      const validData = { x: 'test1', y: 1222 };
      const res = await webhook.processData(validData);

      expect(res.body.message).to.be.eq('invalid');
    });
  });
});
